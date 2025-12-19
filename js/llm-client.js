// LLM APIクライアント - 教育用
class EducationLLMClient {
    constructor(studentId) {
        this.studentId = studentId || API_CONFIG.studentId;
        this.baseURL = API_CONFIG.baseURL;
        this.requestCount = 0;
    }
    
    /**
     * チャット補完APIを呼び出す
     * @param {string} message - 送信するメッセージ
     * @param {object} options - オプション設定
     * @returns {Promise} API応答
     */
    
    
    
    async chat(message, options = {}) {
        try {
            
            this.requestCount++;
            
            console.log(`[Request ${this.requestCount}] Sending: ${message.substring(0, 100)}...`);
            
            // Build request payload and include optional image fields if provided
            const payload = {
                student_id: this.studentId,
                message: message,
                temperature: options.temperature || API_CONFIG.defaultOptions.temperature,
                max_tokens: options.max_tokens || API_CONFIG.defaultOptions.max_tokens
            };

            // If caller supplied image_base64 (data URL) and image_filename, include them.
            // NOTE: Server must be prepared to accept these fields. If not, they will be ignored.
            if (options.image_base64) {
                payload.image_base64 = options.image_base64;
                console.log(`[Request ${this.requestCount}] 画像付きリクエスト: ${options.image_filename}, Data URL size: ${(options.image_base64.length / 1024).toFixed(2)} KB`);
            }
            if (options.image_filename) {
                payload.image_filename = options.image_filename;
            }

            const response = await fetch(`${this.baseURL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`[Response ${this.requestCount}] Received:`, data.response);
            
            return data;
            
        } catch (error) {
            console.error('❌ LLM API Error:', error);
            throw error;
        }
    }
    
    /**
     * 埋め込みAPIを呼び出す
     * @param {string} text - 埋め込みを生成するテキスト
     * @returns {Promise} 埋め込みベクトル
     */
    async getEmbedding(text) {
        try {
            const response = await fetch(`${this.baseURL}/api/embedding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: this.studentId,
                    text: text
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.embedding;
            
        } catch (error) {
            console.error('❌ Embedding API Error:', error);
            throw error;
        }
    }
    
    /**
     * 使用統計を取得
     * @returns {object} リクエスト数
     */
    getStats() {
        return {
            requestCount: this.requestCount
        };
    }
}

// グローバルに使えるようにする
if (typeof window !== 'undefined') {
    window.EducationLLMClient = EducationLLMClient;
}