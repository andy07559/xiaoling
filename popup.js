document.addEventListener('DOMContentLoaded', function() {
    const shortenCurrentBtn = document.getElementById('shortenCurrentBtn');
    const shortenBtn = document.getElementById('shortenBtn');
    const longUrlInput = document.getElementById('longUrl');
    const resultDiv = document.getElementById('result');
    const shortUrlInput = document.getElementById('shortUrl');
    const copyBtn = document.getElementById('copyBtn');
    const messageDiv = document.getElementById('message');
    const currentUrlDiv = document.getElementById('currentUrl');
    const navLinksDiv = document.getElementById('navLinks');
    const menuNameInput = document.getElementById('menuName');
    const addCurrentBtn = document.getElementById('addCurrentBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDialog = document.getElementById('settingsDialog');
    const deleteDialog = document.getElementById('deleteDialog');
    const passwordInput = document.getElementById('passwordInput');
    const deletePasswordInput = document.getElementById('deletePasswordInput');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const quickAddBtn = document.getElementById('quickAddBtn');
    const syncStatusDiv = document.createElement('div');
    syncStatusDiv.className = 'sync-status';
    document.querySelector('.container').appendChild(syncStatusDiv);
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const restoreFile = document.getElementById('restoreFile');
    const cookieBackupBtn = document.getElementById('cookieBackupBtn');
    const cookieRestoreBtn = document.getElementById('cookieRestoreBtn');
    const cookieRestoreFile = document.getElementById('cookieRestoreFile');
    const syncBtn = document.getElementById('syncBtn');

    let pendingDeleteIndex = -1;  // 存储待删除的菜单索引

    // 默认菜单项
    const defaultMenus = [
        { name: '网页记录', url: 'https://590.net/' },
        { name: '小灵日记', url: 'https://139.ink/' },
        { name: '小灵网盘', url: 'https://c.139.ink/home' },
        { name: '短域名', url: 'http://08.ink/' },
        { name: '网页转APP', url: 'https://app.139.ink/' },
        { name: 'AI助手', url: 'https://kimi.moonshot.cn/chat/?ref=xuwenting' },
        { name: '在线阿里', url: 'http://38.147.172.106:8188/' },
        { name: '音乐社', url: 'https://hifizg.com/index/proclass' },
        { name: '图怪兽作图', url: 'https://818ps.com/home/mydesign' }
    ];

    // 添加同步状态检查
    function checkSyncStatus() {
        chrome.storage.sync.get(null, function(items) {
            const lastSync = new Date().toLocaleString();
            syncStatusDiv.textContent = `最后同步: ${lastSync}`;
            syncStatusDiv.classList.add('show');
        });
    }

    // 监听存储变化
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'sync' && changes.menus) {
            // 当其他设备更新了菜单时，自动更新当前显示
            loadMenus();
            showMessage('菜单已同步！');
            checkSyncStatus();
        }
    });

    // 加载菜单
    function loadMenus() {
        chrome.storage.sync.get(['menus'], function(result) {
            let menus = result.menus || defaultMenus;
            renderMenus(menus);
            checkSyncStatus(); // 每次加载菜单时更新同步状态
        });
    }

    // 渲染菜单
    function renderMenus(menus) {
        navLinksDiv.innerHTML = '';
        menus.forEach((menu, index) => {
            const a = document.createElement('a');
            a.href = menu.url;
            a.target = '_blank';
            a.textContent = menu.name;
            
            // 添加删除按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMenu(index);
            };
            
            a.appendChild(deleteBtn);
            navLinksDiv.appendChild(a);
        });
    }

    // 删除菜单
    function deleteMenu(index) {
        chrome.storage.sync.get(['deletePassword'], function(result) {
            const password = result.deletePassword;
            if (password) {
                // 如果设置了密码，显示密码输入对话框
                pendingDeleteIndex = index;
                deleteDialog.classList.add('show');
            } else {
                // 如果没有设置密码，直接删除
                deleteMenuItem(index);
            }
        });
    }

    // 实际执行删除的函数
    function deleteMenuItem(index) {
        chrome.storage.sync.get(['menus'], function(result) {
            let menus = result.menus || defaultMenus;
            menus.splice(index, 1);
            chrome.storage.sync.set({ menus }, function() {
                renderMenus(menus);
                showMessage('菜单已删除！');
            });
        });
    }

    // 添加当前页面为菜单
    addCurrentBtn.addEventListener('click', () => {
        const menuName = menuNameInput.value.trim();
        if (!menuName) {
            showMessage('请输入菜单名称', true);
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                const newMenu = {
                    name: menuName,
                    url: tabs[0].url,
                    addedTime: new Date().toISOString(),
                    deviceName: navigator.platform
                };

                chrome.storage.sync.get(['menus'], function(result) {
                    let menus = result.menus || defaultMenus;
                    menus.push(newMenu);
                    chrome.storage.sync.set({ menus }, function() {
                        renderMenus(menus);
                        menuNameInput.value = '';
                        showMessage('菜单添加成功！');
                        checkSyncStatus();
                    });
                });
            }
        });
    });

    // 获取当前标签页的URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            currentUrlDiv.textContent = '当前页面：' + tabs[0].url;
        }
    });

    // 验证URL
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // 显示消息
    function showMessage(message, isError = false) {
        messageDiv.textContent = message;
        messageDiv.className = 'message ' + (isError ? 'error' : 'success');
        messageDiv.classList.add('show');
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 2000);
    }

    // 缩短URL
    async function shortenUrl(url) {
        try {
            // 首先检查登录状态
            const checkLoginResponse = await fetch('http://08.ink/api/user/info', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer FUFsjLVqMmFxrdTRNZQYmnQjHDOkuorI'
                }
            });

            if (!checkLoginResponse.ok) {
                // 如果未登录，使用快速缩短API
                const quickUrl = `http://08.ink/q/?u=${encodeURIComponent(url)}`;
                const response = await fetch(quickUrl);
                
                if (response.ok) {
                    const finalUrl = response.url;
                    if (finalUrl.includes('08.ink') && !finalUrl.includes('/user/login')) {
                        return finalUrl;
                    }
                }
            }

            // 如果已登录或快速API失败，使用标准API
            const apiResponse = await fetch('http://08.ink/api/url/add', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer FUFsjLVqMmFxrdTRNZQYmnQjHDOkuorI',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            if (!apiResponse.ok) {
                throw new Error('网址缩短失败，请稍后重试');
            }

            const data = await apiResponse.json();
            if (data.error) {
                throw new Error(data.error);
            }

            return data.shorturl || `http://08.ink/${data.id}`;
        } catch (error) {
            console.error('Error:', error);
            throw new Error('网址缩短失败，请稍后重试');
        }
    }

    // 缩短当前页面URL
    shortenCurrentBtn.addEventListener('click', async () => {
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            if (tabs[0]) {
                const url = tabs[0].url;
                
                // 显示加载状态
                shortenCurrentBtn.disabled = true;
                shortenCurrentBtn.textContent = '生成中...';
                
                try {
                    const shortUrl = await shortenUrl(url);
                    // 显示结果
                    shortUrlInput.value = shortUrl;
                    resultDiv.classList.add('show');
                    showMessage('短网址生成成功！');
                } catch (error) {
                    showMessage(error.message, true);
                } finally {
                    // 恢复按钮状态
                    shortenCurrentBtn.disabled = false;
                    shortenCurrentBtn.textContent = '缩短当前网址';
                }
            }
        });
    });

    // 缩短输入的URL
    shortenBtn.addEventListener('click', async () => {
        const url = longUrlInput.value.trim();
        if (!url) {
            showMessage('请输入要缩短的网址', true);
            return;
        }
        if (!isValidUrl(url)) {
            showMessage('请输入有效的网址', true);
            return;
        }
        
        // 显示加载状态
        shortenBtn.disabled = true;
        shortenBtn.textContent = '生成中...';
        
        try {
            const shortUrl = await shortenUrl(url);
            // 显示结果
            shortUrlInput.value = shortUrl;
            resultDiv.classList.add('show');
            showMessage('短网址生成成功！');
        } catch (error) {
            showMessage(error.message, true);
        } finally {
            // 恢复按钮状态
            shortenBtn.disabled = false;
            shortenBtn.textContent = '生成短网址';
        }
    });

    // 复制短网址
    copyBtn.addEventListener('click', () => {
        shortUrlInput.select();
        document.execCommand('copy');
        showMessage('已复制到剪贴板！');
    });

    // 打开设置对话框
    settingsBtn.addEventListener('click', () => {
        chrome.storage.sync.get(['deletePassword'], function(result) {
            passwordInput.value = result.deletePassword || '';
            settingsDialog.classList.add('show');
        });
    });

    // 关闭设置对话框
    cancelBtn.addEventListener('click', () => {
        settingsDialog.classList.remove('show');
    });

    // 保存密码设置
    saveBtn.addEventListener('click', () => {
        const password = passwordInput.value.trim();
        chrome.storage.sync.set({ deletePassword: password }, function() {
            settingsDialog.classList.remove('show');
            showMessage('密码设置已保存！');
        });
    });

    // 关闭删除对话框
    deleteCancelBtn.addEventListener('click', () => {
        deleteDialog.classList.remove('show');
        pendingDeleteIndex = -1;
    });

    // 确认删除
    deleteConfirmBtn.addEventListener('click', () => {
        const inputPassword = deletePasswordInput.value.trim();
        chrome.storage.sync.get(['deletePassword'], function(result) {
            const savedPassword = result.deletePassword;
            if (!savedPassword || savedPassword === inputPassword) {
                // 密码正确或未设置密码，执行删除
                deleteMenuItem(pendingDeleteIndex);
                deleteDialog.classList.remove('show');
                deletePasswordInput.value = '';
            } else {
                showMessage('密码错误！', true);
            }
        });
    });

    // 添加一键添加脚本预览功能
    quickAddBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                const currentUrl = tabs[0].url;
                const currentTitle = tabs[0].title;
                const previewUrl = `https://590.net/?c=admin&page=add_quick_tpl&u=admin&fid=37&Auto_Off=0&Auto_add=0&property=0&url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;
                
                // 在新窗口中打开预览页面
                chrome.windows.create({
                    url: previewUrl,
                    type: 'popup',
                    width: 400,
                    height: 460,
                    left: 200,
                    top: 200
                });
            }
        });
    });

    // 下载备份
    backupBtn.addEventListener('click', () => {
        chrome.storage.sync.get(null, function(data) {
            const backup = {
                menus: data.menus || defaultMenus,
                deletePassword: data.deletePassword || '',
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `xiaolin_nav_backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage('备份文件已下载！');
        });
    });

    // 触发文件选择
    restoreBtn.addEventListener('click', () => {
        restoreFile.click();
    });

    // 处理文件恢复
    restoreFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                // 验证备份数据格式
                if (!Array.isArray(backup.menus)) {
                    throw new Error('无效的备份文件格式');
                }
                
                // 验证每个菜单项
                backup.menus.forEach(menu => {
                    if (!menu.name || !menu.url || typeof menu.name !== 'string' || typeof menu.url !== 'string') {
                        throw new Error('菜单项格式不正确');
                    }
                });
                
                // 恢复数据
                chrome.storage.sync.set({
                    menus: backup.menus,
                    deletePassword: backup.deletePassword || ''
                }, function() {
                    renderMenus(backup.menus);
                    showMessage('数据恢复成功！');
                    checkSyncStatus();
                });
            } catch (error) {
                showMessage('恢复失败：' + error.message, true);
            }
            
            // 清除文件选择
            event.target.value = '';
        };
        
        reader.onerror = () => {
            showMessage('文件读取失败', true);
            event.target.value = '';
        };
        
        reader.readAsText(file);
    });

    // 下载Cookie备份
    cookieBackupBtn.addEventListener('click', async () => {
        try {
            // 获取所有域名的cookie
            const domains = [
                "08.ink",
                "590.net",
                "139.ink",
                "c.139.ink",
                "app.139.ink",
                "kimi.moonshot.cn",
                "hifizg.com",
                "818ps.com"
            ];

            let allCookies = {};
            
            for (const domain of domains) {
                const cookies = await chrome.cookies.getAll({domain: domain});
                if (cookies.length > 0) {
                    allCookies[domain] = cookies;
                }
            }

            const backup = {
                cookies: allCookies,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `xiaolin_cookies_backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage('Cookie备份已下载！');
        } catch (error) {
            showMessage('Cookie备份失败：' + error.message, true);
        }
    });

    // 触发Cookie文件选择
    cookieRestoreBtn.addEventListener('click', () => {
        cookieRestoreFile.click();
    });

    // 处理Cookie文件恢复
    cookieRestoreFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            
            // 验证备份数据格式
            if (!backup.cookies || typeof backup.cookies !== 'object') {
                throw new Error('无效的Cookie备份文件格式');
            }
            
            let successCount = 0;
            let failCount = 0;
            
            // 恢复每个域名的cookies
            for (const [domain, cookies] of Object.entries(backup.cookies)) {
                for (const cookie of cookies) {
                    try {
                        // 首先删除现有的cookie
                        await chrome.cookies.remove({
                            url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                            name: cookie.name
                        });

                        // 构建cookie对象，只包含必要的属性
                        const cookieData = {
                            url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                            name: cookie.name,
                            value: cookie.value,
                            domain: cookie.domain,
                            path: cookie.path || '/',
                            secure: !!cookie.secure,
                            httpOnly: !!cookie.httpOnly
                        };

                        // 添加可选属性
                        if (typeof cookie.expirationDate === 'number') {
                            cookieData.expirationDate = cookie.expirationDate;
                        }
                        
                        if (cookie.sameSite && ['lax', 'strict', 'none'].includes(cookie.sameSite.toLowerCase())) {
                            cookieData.sameSite = cookie.sameSite.toLowerCase();
                            // 如果sameSite为none，secure必须为true
                            if (cookieData.sameSite === 'none') {
                                cookieData.secure = true;
                            }
                        }

                        // 设置cookie
                        await chrome.cookies.set(cookieData);
                        successCount++;
                    } catch (error) {
                        console.error(`恢复Cookie失败: ${domain}, ${cookie.name}`, error);
                        failCount++;
                    }
                }
            }
            
            if (failCount === 0) {
                showMessage(`Cookie恢复成功！共恢复${successCount}个Cookie`);
            } else {
                showMessage(`Cookie部分恢复成功！成功${successCount}个，失败${failCount}个`, true);
            }
        } catch (error) {
            showMessage('Cookie恢复失败：' + error.message, true);
        }
        
        // 清除文件选择
        event.target.value = '';
    });

    // 从URL同步数据
    syncBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('https://c.139.ink/f/MPAtW/xiaolin.json');
            console.log('Sync Response Status:', response.status);
            if (!response.ok) {
                throw new Error('同步失败，请检查网络连接');
            }
            
            const data = await response.json();
            console.log('Sync Response Data:', data);
            
            // 验证数据格式
            if (!Array.isArray(data.menus)) {
                throw new Error('无效的同步数据格式');
            }
            
            // 对菜单项进行兼容性处理
            const fixedMenus = data.menus.map(menu => ({
                name: menu.name ? String(menu.name) : '',
                url: menu.url ? String(menu.url) : ''
            }));
            
            // 更新存储
            chrome.storage.sync.set({ menus: fixedMenus }, function() {
                console.log('Chrome Storage Updated');
                renderMenus(fixedMenus);
                showMessage('数据同步成功！');
                checkSyncStatus();
            });
        } catch (error) {
            console.error('Sync Error:', error);
            showMessage('同步失败：' + error.message, true);
        }
    });

    // 初始化加载菜单
    loadMenus();
}); 