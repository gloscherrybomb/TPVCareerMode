// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const standingsContents = document.querySelectorAll('.standings-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        standingsContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Show corresponding content
        const tabName = button.dataset.tab;
        const targetContent = document.getElementById(tabName + 'Content');
        if (targetContent) {
            targetContent.classList.add('active');
        }
    });
});
