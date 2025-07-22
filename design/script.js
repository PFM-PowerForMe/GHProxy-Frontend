// DOM Elements
const githubForm = document.getElementById('github-form');
const githubLinkInput = document.getElementById('githubLinkInput');
const formattedLinkOutput = document.getElementById('formattedLinkOutput');
const output = document.getElementById('output');
const copyButton = document.getElementById('copyButton');
const openButton = document.getElementById('openButton');
const toast = document.getElementById('toast');
const githubLinkError = document.getElementById('githubLinkError');
const formatToggle = document.getElementById('format-toggle');

/**
 * 显示一个短暂的提示消息 (Toast)。
 * @param {string} message - 要显示的消息内容。
 */
function showToast(message) {
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(() => {
        toast.classList.remove('toast--visible');
    }, 3000);
}

/**
 * 根据用户输入和所选格式生成最终的输出链接或命令。
 * @param {string} githubLink - 用户输入的原始链接。
 * @param {string} format - 选择的输出格式 ('direct', 'git', 'wget', 'docker')。
 * @returns {object} 包含生成结果的对象 { link: string, isUrl: boolean, error?: string }。
 */
function generateOutput(githubLink, format) {
    const base_url = window.location.origin;
    let normalizedLink = githubLink.trim();

    if (!/^https?:\/\//i.test(normalizedLink)) {
        normalizedLink = 'https://' + normalizedLink;
    }

    try {
        const url = new URL(normalizedLink);
        const proxyPath = url.hostname + url.pathname + url.search + url.hash;
        const directLink = `${base_url}/${proxyPath}`;

        switch (format) {
            case 'git':
                if (url.pathname.endsWith('.git')) {
                    return { link: `git clone ${directLink}`, isUrl: false };
                } else {
                    return { link: '', isUrl: false, error: 'Input URL must end with .git for git clone' };
                }
            case 'wget':
                return { link: `wget "${directLink}"`, isUrl: false };
            case 'docker':
                const dockerImageRef = `${window.location.host}/${proxyPath}`;
                return { link: `docker pull ${dockerImageRef}`, isUrl: false };
            case 'direct':
            default:
                return { link: directLink, isUrl: true };
        }
    } catch (e) {
        return { error: 'Invalid URL format' };
    }
}

/**
 * 处理表单提交或格式切换的逻辑。
 */
function handleFormAction() {
    githubLinkError.textContent = '';
    githubLinkError.classList.remove('text-field__error--visible');

    const githubLink = githubLinkInput.value.trim();
    const selectedFormat = formatToggle.querySelector('.active').dataset.value;

    if (!githubLink) {
        githubLinkError.textContent = 'Please enter a GitHub link';
        githubLinkError.classList.add('text-field__error--visible');
        return;
    }

    const result = generateOutput(githubLink, selectedFormat);

    if (result.error) {
        githubLinkError.textContent = result.error;
        githubLinkError.classList.add('text-field__error--visible');
        output.style.display = 'none';
    } else {
        formattedLinkOutput.textContent = result.link;
        output.style.display = result.link ? 'flex' : 'none';

        openButton.disabled = !result.isUrl;
    }
}

// 监听表单提交事件
githubForm.addEventListener('submit', function (e) {
    e.preventDefault();
    handleFormAction();
});

// --- Segmented Control Slider ---
const slider = document.createElement('div');
slider.className = 'segmented-control__slider';
formatToggle.prepend(slider);

function updateSliderPosition() {
    const activeButton = formatToggle.querySelector('.active');
    if (activeButton) {
        const rect = activeButton.getBoundingClientRect();
        const containerRect = formatToggle.getBoundingClientRect();
        slider.style.width = `${rect.width}px`;
        slider.style.transform = `translateX(${rect.left - containerRect.left}px)`;
    }
}

// 为分段控件添加点击事件委托
formatToggle.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button || button.classList.contains('active')) {
        return;
    }

    formatToggle.querySelector('.active')?.classList.remove('active');
    button.classList.add('active');

    updateSliderPosition();

    if (githubLinkInput.value.trim()) {
        handleFormAction();
    }
});

// Initial slider position
document.addEventListener('DOMContentLoaded', () => {
    // Timeout to ensure correct initial rendering
    setTimeout(updateSliderPosition, 50);
});
window.addEventListener('resize', updateSliderPosition);

// 当用户在输入框中输入时, 清除错误提示
githubLinkInput.addEventListener('input', () => {
    githubLinkError.textContent = '';
    githubLinkError.classList.remove('text-field__error--visible');
});

// 复制和打开按钮的事件监听
copyButton.addEventListener('click', function () {
    if (!formattedLinkOutput.textContent) return;
    navigator.clipboard.writeText(formattedLinkOutput.textContent).then(() => {
        showToast('Copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy');
    });
});
openButton.addEventListener('click', function () {
    if (!openButton.disabled) {
        window.open(formattedLinkOutput.textContent, '_blank');
    }
});

/**
 * 一个通用的 API 请求函数, 用于获取数据并更新UI。
 * @param {string} endpoint - API 的路径。
 * @param {string} elementId - 要更新的 HTML 元素的 ID。
 * @param {function(object): string} formatter - 一个将 API 返回的 data 对象格式化为字符串的函数。
 * @param {string} [errorText='Error'] - 发生错误时显示的文本。
 */
async function fetchData(endpoint, elementId, formatter, errorText = 'Error') {
    const element = document.getElementById(elementId);
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        element.textContent = formatter(data);
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        element.textContent = errorText;
    }
}


/**
 * 格式化API状态的通用函数
 * @param {object} data - API返回的数据
 * @returns {string} - 格式化后的状态文本
 */
function formatStatus(data) {
    if (data && typeof data.enabled !== 'undefined') {
        return data.enabled ? '已开启' : '已关闭';
    }
    return '无法获取';
}

// 页面加载时获取所有API数据
function fetchAllApis() {
    fetchData('/api/version', 'versionBadge', data => data.Version, 'N/A');
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


// DOM加载完成后执行API请求
document.addEventListener('DOMContentLoaded', fetchAllApis);