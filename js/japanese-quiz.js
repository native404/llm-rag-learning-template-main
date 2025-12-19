document.addEventListener('DOMContentLoaded', () => {
    const questionWordEl = document.getElementById('question-word');
    const answerInputEl = document.getElementById('answer-input');
    const feedbackEl = document.getElementById('feedback');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const modeRadios = document.querySelectorAll('input[name="quiz-mode"]');

    let allQuizData = [];
    let incorrectQuestions = [];
    let currentQuestion = null;
    let currentMode = 'normal'; // 'normal' or 'review'

    // Fetch quiz data from JSON file
    async function loadQuizData() {
        try {
            const response = await fetch('../data/japan-language.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allQuizData = data.documents;
            displayNewQuestion();
        } catch (error) {
            questionWordEl.textContent = 'データの読み込みに失敗しました。';
            console.error('Failed to load quiz data:', error);
        }
    }

    // Display a new question based on the current mode
    function displayNewQuestion() {
        feedbackEl.textContent = '';
        answerInputEl.value = '';
        answerInputEl.focus();
        submitAnswerBtn.disabled = false;

        let sourceData = currentMode === 'normal' ? allQuizData : incorrectQuestions;

        if (sourceData.length === 0) {
            questionWordEl.textContent = currentMode === 'review' ? '復習する問題はありません。' : '単語がありません。';
            currentQuestion = null;
            submitAnswerBtn.disabled = true;
            answerInputEl.disabled = true;
            return;
        }
        answerInputEl.disabled = false;


        const randomIndex = Math.floor(Math.random() * sourceData.length);
        currentQuestion = sourceData[randomIndex];
        questionWordEl.textContent = currentQuestion.title;
    }

    // Check the user's answer
    function checkAnswer() {
        if (!currentQuestion || submitAnswerBtn.disabled) return;

        const userAnswer = answerInputEl.value.trim();
        const correctAnswer = currentQuestion.content.replace('読み：', '').trim();

        if (userAnswer === correctAnswer) {
            feedbackEl.textContent = '正解！';
            feedbackEl.style.color = 'green';
            // If correct in review mode, remove it from the list
            if (currentMode === 'review') {
                incorrectQuestions = incorrectQuestions.filter(q => q.id !== currentQuestion.id);
            }
        } else {
            feedbackEl.textContent = `不正解。正しくは「${correctAnswer}」です。`;
            feedbackEl.style.color = 'red';
            // Add to incorrect list if not already there
            if (!incorrectQuestions.some(q => q.id === currentQuestion.id)) {
                incorrectQuestions.push(currentQuestion);
            }
        }
        submitAnswerBtn.disabled = true;
    }

    // Handle mode change
    function handleModeChange(event) {
        currentMode = event.target.value;
        displayNewQuestion();
    }
    
    // Handle Enter key press
    function handleEnterKey(event) {
        if (event.key !== 'Enter') return;
        
        if (submitAnswerBtn.disabled) {
            // If answer is already submitted, move to next question
            displayNewQuestion();
        } else {
            // Otherwise, check the answer
            checkAnswer();
        }
    }

    // Event Listeners
    submitAnswerBtn.addEventListener('click', checkAnswer);
    nextQuestionBtn.addEventListener('click', displayNewQuestion);
    answerInputEl.addEventListener('keypress', handleEnterKey);
    modeRadios.forEach(radio => radio.addEventListener('change', handleModeChange));

    // Initial load
    loadQuizData();
});
