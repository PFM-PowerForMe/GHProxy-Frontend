const urlInput = document.getElementById('url-input');
const copyButton = document.getElementById('copy-button');
const currentUrlElement = document.getElementById('current-url');

function getCurrentUrl() {
    let url = window.location.href;
    if (!url.endsWith('/')) {
        url += '/';
    }
    return url;
}

document.addEventListener('DOMContentLoaded', function () {
    currentUrlElement.textContent = getCurrentUrl();

    document.getElementById('url-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const url = urlInput.value;
        if (url.toLowerCase().indexOf("github".toLowerCase()) < 0) {
            alert("仅支持加速 GitHub");
        } else {
            const currentUrl = getCurrentUrl();
            const fullUrl = currentUrl + url;
            window.open(fullUrl);
        }
    });
});

copyButton.addEventListener('click', function () {
    const url = urlInput.value;
    if (url.toLowerCase().indexOf("github".toLowerCase()) < 0) {
        alert("请输入有效的 GitHub 链接！");
    } else {
        const currentUrl = getCurrentUrl();
        const fullUrl = currentUrl + url;
        navigator.clipboard.writeText(fullUrl).then(() => {
            alert("完整链接已复制到剪贴板！");
        });
    }
});
function fetchAPI() {
    const apiEndpoints = [
        { url: '/api/size_limit', elementId: 'sizeLimitDisplay', successHandler: data => `大小限制：${data.MaxResponseBodySize} MB` },
        { url: '/api/whitelist/status', elementId: 'whiteListStatus', successHandler: data => data.Whitelist ? '白名单：已启用' : '白名单：未启用' },
        { url: '/api/blacklist/status', elementId: 'blackListStatus', successHandler: data => data.Blacklist ? '黑名单：已启用' : '黑名单：未启用' },
        { url: '/api/smartgit/status', elementId: 'gitCloneCacheStatus', successHandler: data => data.enabled ? 'Git缓存：开启' : 'Git缓存：关闭' },
        { url: '/api/version', elementId: 'versionBadge', successHandler: data => `版本：${data.Version}` },
    ];

    apiEndpoints.forEach(endpoint => {
        fetch(endpoint.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                document.getElementById(endpoint.elementId).textContent = endpoint.successHandler(data);
            })
            .catch(error => {
                console.error(`Error fetching ${endpoint.url}:`, error);
                document.getElementById(endpoint.elementId).textContent = '加载失败';
            });
    });
}
document.addEventListener('DOMContentLoaded', fetchAPI);