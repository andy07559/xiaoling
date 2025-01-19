// 当DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素引用
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
    
    // 创建同步状态显示元素
    const syncStatusDiv = document.createElement('div');
    syncStatusDiv.className = 'sync-status';
    document.querySelector('.container').appendChild(syncStatusDiv);
    
    // 获取备份相关按钮
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const restoreFile = document.getElementById('restoreFile');
    const cookieBackupBtn = document.getElementById('cookieBackupBtn');
    const cookieRestoreBtn = document.getElementById('cookieRestoreBtn');
    const cookieRestoreFile = document.getElementById('cookieRestoreFile');

    // 存储待删除菜单的索引
    let pendingDeleteIndex = -1;

    // 默认导航菜单配置
    const defaultMenus = [
        { name: '网页记录', url: 'https://590.net/' },
        { name: '小灵日记', url: 'https://139.ink/' },
        { name: '小灵网盘', url: 'https://c.139.ink/home' },
        { name: '短域名', url: 'http://08.ink/' },
        { name: '网页转APP', url: 'https://app.139.ink/' },
        { name: 'AI助手', url: 'https://kimi.moonshot.cn/chat/' },
        { name: '在线阿里', url: 'http://38.147.172.106:8188/' },
        { name: '音乐社', url: 'https://hifizg.com/index/proclass' },
        { name: '图怪兽作图', url: 'https://818ps.com/home/mydesign' }
    ];

    // 检查同步状态
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

    // 加载菜单数据
    function loadMenus() {
        chrome.storage.sync.get(['menus'], function(result) {
            let menus = result.menus || defaultMenus;
            renderMenus(menus);
            checkSyncStatus();
        });
    }

    // 渲染菜单到页面
    function renderMenus(menus) {
        navLinksDiv.innerHTML = '';
        menus.forEach((menu, index) => {
            const a = document.createElement('a');
            a.href = menu.url;
            a.target = '_blank';
            a.textContent = menu.name;
            
            // 创建删除按钮
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

    // 删除菜单项
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

    // 执行删除菜单项操作
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

    // 添加当前页面到菜单
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

    // 获取当前标签页URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            currentUrlDiv.textContent = '当前页面：' + tabs[0].url;
        }
    });

    // 验证URL是否有效
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // 显示消息提示
    function showMessage(message, isError = false) {
        messageDiv.textContent = message;
        messageDiv.className = 'message ' + (isError ? 'error' : 'success');
        messageDiv.classList.add('show');
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 2000);
    }

    // 缩短URL的核心功能
    async function shortenUrl(url) {
        try {
            // 检查登录状态
            const checkLoginResponse = await fetch('http://08.ink/api/user/info', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer FUFsjLVqMmFxrdTRNZQYmnQjHDOkuorI'
                }
            });

            if (!checkLoginResponse.ok) {
                // 未登录时使用快速缩短API
                const quickUrl = `http://08.ink/q/?u=${encodeURIComponent(url)}`;
                const response = await fetch(quickUrl);
                
                if (response.ok) {
                    const finalUrl = response.url;
                    if (finalUrl.includes('08.ink') && !finalUrl.includes('/user/login')) {
                        return finalUrl;
                    }
                }
            }

            // 已登录或快速API失败时使用标准API
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

    // 缩短当前页面URL的点击事件处理
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
                    shortenCurrentBtn.textContent = '缩短当前页面';
                }
            }
        });
    });

    // 缩短输入URL的点击事件处理
    shortenBtn.addEventListener('click', async () => {
        const url = longUrlInput.value.trim();
        
        if (!url) {
            showMessage('请输入网址', true);
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

    // 复制短网址的点击事件处理
    copyBtn.addEventListener('click', () => {
        shortUrlInput.select();
        document.execCommand('copy');
        showMessage('已复制到剪贴板！');
    });

    // 设置按钮点击事件
    settingsBtn.addEventListener('click', () => {
        chrome.storage.sync.get(['deletePassword'], function(result) {
            passwordInput.value = result.deletePassword || '';
            settingsDialog.classList.add('show');
        });
    });

    // 保存设置
    saveBtn.addEventListener('click', () => {
        const password = passwordInput.value.trim();
        chrome.storage.sync.set({ deletePassword: password }, function() {
            settingsDialog.classList.remove('show');
            showMessage('设置已保存！');
        });
    });

    // 取消设置
    cancelBtn.addEventListener('click', () => {
        settingsDialog.classList.remove('show');
    });

    // 确认删除
    deleteConfirmBtn.addEventListener('click', () => {
        chrome.storage.sync.get(['deletePassword'], function(result) {
            const password = result.deletePassword;
            if (deletePasswordInput.value === password) {
                deleteMenuItem(pendingDeleteIndex);
                deleteDialog.classList.remove('show');
                deletePasswordInput.value = '';
            } else {
                showMessage('密码错误！', true);
            }
        });
    });

    // 取消删除
    deleteCancelBtn.addEventListener('click', () => {
        deleteDialog.classList.remove('show');
        deletePasswordInput.value = '';
    });

    // 快速添加功能
    quickAddBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                const url = tabs[0].url;
                const title = tabs[0].title;
                
                menuNameInput.value = title;
                showMessage('已自动填充页面标题');
            }
        });
    });

    // 初始化加载菜单
    loadMenus();
}); 