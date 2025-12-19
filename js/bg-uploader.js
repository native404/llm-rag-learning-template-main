// js/bg-uploader.js
// ページ背景をアップロードして設定・永続化する小さなユーティリティ

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('bg-input');
    const clearBtn = document.getElementById('bg-clear');
    const preview = document.getElementById('bg-preview');

    // 保存されている背景を読み込む
    const saved = localStorage.getItem('siteBackground');
    if (saved) {
        applyBackground(saved);
        setPreview(saved);
    }

    if (input) {
        input.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            // ファイルサイズが大きすぎる場合は警告（例: 5MB 超）
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                if (!confirm('選択した画像が大きすぎます。自動でリサイズしてもよいですか？(推奨)')) {
                    return;
                }
            }

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                // 簡易的にリサイズして保存（canvas を使う）
                resizeImageIfNeeded(dataUrl, 2048, 2048, 0.85, (resizedDataUrl) => {
                    localStorage.setItem('siteBackground', resizedDataUrl);
                    applyBackground(resizedDataUrl);
                    setPreview(resizedDataUrl);
                });
            };
            reader.readAsDataURL(file);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            localStorage.removeItem('siteBackground');
            document.body.style.backgroundImage = '';
            if (preview) preview.innerHTML = '';
        });
    }
});

function applyBackground(dataUrl) {
    document.body.style.backgroundImage = `url('${dataUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
}

// プレビューを一つだけ管理して src を更新するユーティリティ
function setPreview(dataUrl) {
    const preview = document.getElementById('bg-preview');
    if (!preview) return;
    // プレビュー表示は不要なので非表示にする（背景のみ適用）
    preview.innerHTML = '';
    preview.style.display = 'none';
}

// dataURL を受け取り、必要に応じて幅/高さを制限して圧縮した dataURL をコールバックで返す
function resizeImageIfNeeded(dataUrl, maxWidth, maxHeight, quality, callback) {
    const img = new Image();
    img.onload = function() {
        let width = img.width;
        let height = img.height;
        if (width <= maxWidth && height <= maxHeight) {
            // リサイズ不要
            callback(dataUrl);
            return;
        }
        // アスペクト比を保ってリサイズ
        if (width > height) {
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const resized = canvas.toDataURL('image/jpeg', quality);
        callback(resized);
    };
    img.onerror = function() {
        // 読み込みできない場合は元のを返す
        callback(dataUrl);
    };
    img.src = dataUrl;
}
