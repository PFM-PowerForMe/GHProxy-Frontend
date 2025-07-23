document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素引用
    const githubForm = document.getElementById('github-form');
    const githubLinkInput = document.getElementById('githubLinkInput');
    const githubLinkError = document.getElementById('githubLinkError');
    const formattedLinkOutput = document.getElementById('formattedLinkOutput');
    const outputArea = document.getElementById('output');
    const copyButton = document.getElementById('copyButton');
    const openButton = document.getElementById('openButton');
    const flashContainer = document.querySelector('.flash-container');
    const versionBadge = document.getElementById('versionBadge');
    const formatToggle = document.getElementById('format-toggle');

    /**
     * 显示一个短暂的提示消息 (Flash/Toast).
     * @param {string} message - 要显示的消息内容.
     * @param {string} [type='success'] - 消息类型 ('success' 或 'error').
     */
    function showToast(message, type = 'success') {
        const flashMessage = document.createElement('div');
        flashMessage.className = `flash flash--${type}`;

        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = type === 'success' ? 'check_circle' : 'error';

        flashMessage.appendChild(icon);
        flashMessage.appendChild(document.createTextNode(` ${message}`));

        flashContainer.appendChild(flashMessage);
        
        // 确保动画在元素被移除前完成
        setTimeout(() => {
             flashMessage.style.opacity = '0';
             flashMessage.addEventListener('transitionend', () => flashMessage.remove());
        }, 3000);
    }

    /**
     * 根据用户输入和所选格式生成最终的输出链接或命令.
     * @param {string} userInput - 用户输入的原始链接或 Docker 镜像名.
     * @param {string} format - 选择的输出格式 ('direct', 'git', 'wget', 'docker').
     * @returns {object} 包含生成结果的对象 { link: string, isUrl: boolean, error?: string }.
     */
    function generateOutput(userInput, format) {
        const baseUrl = window.location.origin;
        const host = window.location.host;
        let normalizedLink = userInput.trim();

        try {
            // Docker 格式优先处理, 因为它不一定是 URL
            if (format === 'docker') {
                // 简单的 Docker 镜像名验证 (例如: owner/repo:tag)
                if (normalizedLink.includes('/') && !normalizedLink.startsWith('http')) {
                    return { link: `docker pull ${host}/${normalizedLink}`, isUrl: false };
                }
                // 尝试从 URL 中提取 Docker 镜像路径
                if (normalizedLink.startsWith('http')) {
                    const url = new URL(normalizedLink);
                    if(url.hostname === 'github.com') {
                        const pathParts = url.pathname.split('/').filter(p => p);
                        if (pathParts.length >= 2) {
                             return { link: `docker pull ${host}/${pathParts[0]}/${pathParts[1]}`, isUrl: false };
                        }
                    }
                }
                 return { error: '请输入有效的 Docker 镜像名 (例如: owner/repo)' };
            }
            
            // 处理其他 URL 格式
            if (!/^https?:\/\//i.test(normalizedLink)) {
                normalizedLink = 'https://' + normalizedLink;
            }
            const url = new URL(normalizedLink);
            const proxyPath = url.hostname + url.pathname + url.search + url.hash;
            const directLink = `${baseUrl}/${proxyPath}`;

            switch (format) {
                case 'git':
                    if (url.pathname.endsWith('.git')) {
                        return { link: `git clone ${directLink}`, isUrl: false };
                    }
                    return { error: 'Git Clone 需要以 .git 结尾的仓库链接' };
                case 'wget':
                    return { link: `wget "${directLink}"`, isUrl: false };
                case 'direct':
                default:
                    return { link: directLink, isUrl: true };
            }
        } catch (e) {
            return { error: '请输入一个有效的 URL' };
        }
    }

    /**
     * 处理表单提交或格式切换的逻辑.
     */
    function handleFormAction() {
        githubLinkError.textContent = '';
        githubLinkError.style.display = 'none';
        githubLinkInput.classList.remove('is-invalid');

        const userInput = githubLinkInput.value.trim();
        const selectedFormat = formatToggle.querySelector('.is-selected').dataset.value;

        if (!userInput) {
            githubLinkError.textContent = '请输入链接或镜像名';
            githubLinkError.style.display = 'block';
            githubLinkInput.classList.add('is-invalid');
            return;
        }

        const result = generateOutput(userInput, selectedFormat);

        if (result.error) {
            githubLinkError.textContent = result.error;
            githubLinkError.style.display = 'block';
            githubLinkInput.classList.add('is-invalid');
            outputArea.style.display = 'none';
        } else {
            formattedLinkOutput.value = result.link;
            outputArea.style.display = 'block';
            openButton.disabled = !result.isUrl;
        }
    }

    // --- 事件监听 ---
    githubForm.addEventListener('submit', function (e) {
        e.preventDefault();
        handleFormAction();
    });

    formatToggle.addEventListener('click', (e) => {
        const button = e.target.closest('.SegmentedControl-button');
        if (!button || button.classList.contains('is-selected')) {
            return;
        }

        formatToggle.querySelector('.is-selected')?.classList.remove('is-selected');
        button.classList.add('is-selected');

        if (githubLinkInput.value.trim()) {
            handleFormAction();
        }
    });

    githubLinkInput.addEventListener('input', () => {
        githubLinkError.textContent = '';
        githubLinkError.style.display = 'none';
        githubLinkInput.classList.remove('is-invalid');
    });

    copyButton.addEventListener('click', function () {
        if (!formattedLinkOutput.value) return;
        navigator.clipboard.writeText(formattedLinkOutput.value).then(() => {
            showToast('链接已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('无法复制: ', err);
            showToast('复制失败', 'error');
        });
    });

    openButton.addEventListener('click', function () {
        if (!openButton.disabled) {
            window.open(formattedLinkOutput.value, '_blank');
        }
    });

    // --- API 数据获取 ---
    function fetchAPIStatus() {
        const updateElementText = (elementId, text) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = text;
        };
        const fetchData = (url, elementId, processFn, errorText = '加载失败') => {
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                    return response.json();
                })
                .then(data => updateElementText(elementId, processFn(data)))
                .catch(error => {
                    console.error(`Error fetching ${url}:`, error);
                    updateElementText(elementId, errorText);
                });
        };
        const formatStatus = data => (data && typeof data.enabled !== 'undefined') ? (data.enabled ? '已开启' : '已关闭') : '无法获取';
        
        fetchData('/api/version', 'versionBadge', data => `v${data.Version}`, 'N/A');
        fetchData('/api/size_limit', 'sizeLimitDisplay', data => `${data.MaxResponseBodySize} MB`, '无法获取');
        fetchData('/api/whitelist/status', 'whiteListStatus', data => data.Whitelist ? '已开启' : '已关闭', '无法获取');
        fetchData('/api/blacklist/status', 'blackListStatus', data => data.Blacklist ? '已开启' : '已关闭', '无法获取');
        fetchData('/api/smartgit/status', 'gitCloneCacheStatus', formatStatus, '无法获取');
        fetchData('/api/oci_proxy/status', 'ociProxyStatus', data => {
            if (data && typeof data.enabled !== 'undefined') {
                if (!data.enabled) return '已关闭';
                let target = '';
                if (data.target === 'ghcr') target = ' (目标: ghcr.io)';
                else if (data.target === 'dockerhub') target = ' (目标: DockerHub)';
                return `已开启${target}`;
            }
            return '无法获取';
        }, '无法获取');
        fetchData('/api/shell_nest/status', 'shellNestStatus', formatStatus, '无法获取');
    }

    fetchAPIStatus();
});