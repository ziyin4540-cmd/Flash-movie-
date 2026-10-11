// Intro Animation & Typing Effect Logic
function runIntroTypingEffect() {
    const textElement = document.getElementById('typing-intro-text');
    const message = "Welcome To Flâsh Movie";
    let index = 0;

    if (textElement) {
        textElement.innerText = "";
        function type() {
            if (index <= message.length) {
                textElement.innerText = message.substring(0, index);
                index++;
                setTimeout(type, 30);
            } else {
                hideIntroAndCheckSession();
            }
        }
        type();
    } else {
        hideIntroAndCheckSession();
    }
}

function hideIntroAndCheckSession() {
    const introScreen = document.getElementById('intro-screen');
    if (introScreen) {
        introScreen.style.display = 'none';
    }
    if (typeof checkUserSession === 'function') {
        checkUserSession();
    }
}
