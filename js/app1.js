// メインアプリケーション
let llmClient;
const systemPrompt = "質問に対し、返答の最初は「ありがとうございます」を追加してください。";
// 選択された画像を保持
let selectedImageDataURL = null;
let selectedImageFileName = null;
// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // LLMクライアントの初期化
    llmClient = new EducationLLMClient(API_CONFIG.studentId);
    
    // 学生IDを表示
    document.getElementById('student-id').textContent = API_CONFIG.studentId;
    
    console.log('🚀 システム初期化完了');
});

// メッセージ送信
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    // メッセージが空かつ画像も未選択なら送信不可
    if (!message && !selectedImageDataURL) {
        alert('メッセージか画像を選択してください');
        return;
    }
    
    // ユーザーメッセージを表示（画像のみの場合はテキストを補完）
    const displayedUserText = message || '(画像のみを送信)';
    addMessage(displayedUserText, 'user');
    input.value = '';
    
    try {
        // systemPromptとユーザーメッセージを結合
        let fullMessage = `${systemPrompt}\n\nユーザーの質問:\n${message}`;

        // 画像が選択されている場合は画像情報を付加して送信
        if (selectedImageDataURL) {
            try {
                const dims = await getImageDimensions(selectedImageDataURL);
                fullMessage += `\n\n[添付画像情報]\nファイル名: ${selectedImageFileName}\n幅: ${dims.width}px 高さ: ${dims.height}px\n\n画像内容について推測して説明してください。`;
            } catch (err) {
                // サイズ取得に失敗しても送信は続ける
                fullMessage += `\n\n[添付画像情報]\nファイル名: ${selectedImageFileName}\n(画像サイズ取得エラー)\n\n画像内容について推測して説明してください。`;
            }
        }

        // API呼び出し — 画像がある場合は image_base64 と image_filename をオプションで渡す
        const chatOptions = {};
        if (selectedImageDataURL) {
            chatOptions.image_base64 = selectedImageDataURL;
            chatOptions.image_filename = selectedImageFileName;
        }
        const response = await llmClient.chat(fullMessage, chatOptions);

        // AI応答を表示
        addMessage(response.response, 'ai');

        // 統計更新
        updateStats();

        // 送信後は画像情報をクリアしてプレビューを削除
        if (selectedImageDataURL) {
            selectedImageDataURL = null;
            selectedImageFileName = null;
            const preview = document.getElementById('image-preview');
            if (preview) {
                preview.innerHTML = '';
                preview.setAttribute('aria-hidden', 'true');
            }
        }
        
    } catch (error) {
        addMessage('エラーが発生しました: ' + error.message, 'system');
    }
}

// 画像ファイル選択ハンドラ
function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    selectedImageFileName = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedImageDataURL = e.target.result;
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.innerHTML = `<img src="${selectedImageDataURL}" alt="選択された画像プレビュー">`;
            preview.setAttribute('aria-hidden', 'false');
        }
        // フォーカスを入力欄へ戻す
        const input = document.getElementById('user-input');
        if (input) input.focus();
    };
    reader.readAsDataURL(file);
}

// dataURLから画像の幅・高さを取得するユーティリティ
function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = function(err) {
            reject(err);
        };
        img.src = dataUrl;
    });
}

// メッセージをチャットに追加
function addMessage(text, type) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 統計情報を更新
function updateStats() {
    const stats = llmClient.getStats();
    document.getElementById('request-count').textContent = stats.requestCount;
}

// Enterキーで送信
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}