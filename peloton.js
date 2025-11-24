// Join peloton button
const joinBtn = document.getElementById('joinBtn');

if (joinBtn) {
    joinBtn.addEventListener('click', () => {
        if (window.careerMode && window.careerMode.openModal) {
            window.careerMode.openModal('signup');
        }
    });
}
