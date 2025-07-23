// --- 模块级常量与 DOM 元素获取 ---
const Elements = {
    form: document.getElementById('github-form'),
    input: document.getElementById('githubLinkInput'),
    errorMsg: document.getElementById('error-message'),
    outputArea: document.getElementById('output'),
    outputPre: document.getElementById('formattedLinkOutput'),
    copyBtn: document.getElementById('copyButton'),
    openBtn: document.getElementById('openButton'),
    toastContainer: document.getElementById('toast-container'),
    versionBadge: document.getElementById('versionBadge'),
    formatToggle: document.getElementById('format-toggle'),
    slider: document.querySelector('.segmented-control .slider'),
};

/**
 * 显示 Toast 通知.
 * @param {string} message 消息内容.
 * @param {boolean} [isError=false] 是否为错误消息.
 */
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    toast.textContent = message;
    Elements.toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

/**
 * 显示或隐藏输入框下方的错误信息.
 * @param {string} [message] 错误信息, 为空则隐藏.
 */
const displayError = (message) => {
    Elements.errorMsg.textContent = message || '';
    Elements.errorMsg.style.display = message ? 'block' : 'none';
};

/**
 * 根据输入和格式生成输出.
 * @param {string} userInput 用户输入.
 * @param {string} format 输出格式.
 * @returns {{link: string, isUrl: boolean, error?: string}}
 */
function generateOutput(userInput, format) {
    const { origin, host } = window.location;
    const input = userInput.trim();

    try {
        if (format === 'docker') {
            if (input.includes('/') && !input.includes(' ') && !input.startsWith('http')) {
                return { link: `docker pull ${host}/${input}`, isUrl: false };
            }
            return { error: '请输入有效的 Docker 镜像名 (例如: owner/repo)' };
        }

        const url = new URL(input.startsWith('http') ? input : `https://${input}`);
        const proxyPath = `${url.hostname}${url.pathname}${url.search}${url.hash}`;
        const directLink = `${origin}/${proxyPath}`;

        switch (format) {
            case 'git':
                 if (!url.pathname.endsWith('.git')) {
                    return { error: 'Git Clone 需要以 .git 结尾的仓库链接' };
                }
                return { link: `git clone ${directLink}`, isUrl: false };
            case 'wget':
                return { link: `wget "${directLink}"`, isUrl: false };
            default:
                return { link: directLink, isUrl: true };
        }
    } catch (e) {
        return { error: '请输入一个有效的 URL' };
    }
}

/**
 * 更新分段选择器滑块的位置.
 */
function updateSliderPosition() {
    const activeButton = Elements.formatToggle.querySelector('.active');
    if (activeButton) {
        Elements.slider.style.width = `${activeButton.offsetWidth}px`;
        Elements.slider.style.transform = `translateX(${activeButton.offsetLeft}px)`;
    }
}

/**
 * 主处理函数, 在提交或切换格式时调用.
 */
function handleAction() {
    displayError();
    const userInput = Elements.input.value;
    if (!userInput.trim()) {
        Elements.outputArea.style.display = 'none';
        return;
    }
    
    const selectedFormat = Elements.formatToggle.querySelector('.active').dataset.value;
    const result = generateOutput(userInput, selectedFormat);

    if (result.error) {
        displayError(result.error);
        Elements.outputArea.style.display = 'none';
    } else {
        Elements.outputPre.textContent = result.link;
        Elements.outputArea.style.display = 'flex';
        Elements.openBtn.disabled = !result.isUrl;
    }
}

/**
 * 获取并更新所有 API 状态.
 */
async function fetchAPIStatus() {
    const formatStatus = (data) => (data?.enabled ? '已开启' : '已关闭');
    const apiEndpoints = [
        { url: '/api/version', id: 'versionBadge', formatter: data => data.Version },
        { url: '/api/size_limit', id: 'sizeLimitDisplay', formatter: data => `${data.MaxResponseBodySize} MB` },
        { url: '/api/whitelist/status', id: 'whiteListStatus', formatter: data => data.Whitelist ? '已开启' : '已关闭' },
        { url: '/api/blacklist/status', id: 'blackListStatus', formatter: data => data.Blacklist ? '已开启' : '已关闭' },
        { url: '/api/smartgit/status', id: 'gitCloneCacheStatus', formatter: formatStatus },
        { url: '/api/shell_nest/status', id: 'shellNestStatus', formatter: formatStatus },
        { url: '/api/oci_proxy/status', id: 'ociProxyStatus', formatter: data => {
            if (data?.enabled) {
                const targetMap = { ghcr: '(ghcr.io)', dockerhub: '(DockerHub)' };
                return `已开启 ${targetMap[data.target] || ''}`.trim();
            }
            return '已关闭';
        }}
    ];

    for (const { url, id, formatter } of apiEndpoints) {
        const element = document.getElementById(id);
        if (!element) continue;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            element.textContent = formatter(await res.json());
        } catch (error) {
            console.error(`获取 ${url} 失败:`, error);
            element.textContent = '加载失败';
        }
    }
}


/**
 * 初始化滑块逻辑.
 */
function initSlider() {
    // 立即更新一次位置以防万一
    updateSliderPosition();

    // 关键修复: 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
        // 当容器尺寸变化时 (包括窗口缩放, 字体加载等), 更新滑块位置
        updateSliderPosition();
    });
    
    // 开始监听 formatToggle 元素
    resizeObserver.observe(Elements.formatToggle);
}


// --- 事件监听与初始化 ---
Elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAction();
});

Elements.formatToggle.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button || button.classList.contains('active')) return;
    Elements.formatToggle.querySelector('.active')?.classList.remove('active');
    button.classList.add('active');
    updateSliderPosition(); // 点击后立即更新
    handleAction();
});

Elements.copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(Elements.outputPre.textContent)
        .then(() => showToast('已复制到剪贴板'))
        .catch(() => showToast('复制失败', true));
});

Elements.openBtn.addEventListener('click', () => {
    if (!Elements.openBtn.disabled) {
        window.open(Elements.outputPre.textContent, '_blank');
    }
});


document.addEventListener('DOMContentLoaded', () => {
    fetchAPIStatus();
    initSlider(); // 初始化滑块
});