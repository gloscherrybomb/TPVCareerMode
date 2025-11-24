// Event filtering functionality
const filterButtons = document.querySelectorAll('.filter-btn');
const eventCards = document.querySelectorAll('.event-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        const filter = button.dataset.filter;
        
        // Filter event cards
        eventCards.forEach(card => {
            const status = card.dataset.status;
            
            if (filter === 'all') {
                card.style.display = 'flex';
                // Re-trigger animation
                card.style.animation = 'none';
                setTimeout(() => {
                    card.style.animation = 'fadeInUp 0.6s ease-out both';
                }, 10);
            } else if (filter === status) {
                card.style.display = 'flex';
                card.style.animation = 'none';
                setTimeout(() => {
                    card.style.animation = 'fadeInUp 0.6s ease-out both';
                }, 10);
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Login prompt button
const promptLoginBtn = document.getElementById('promptLoginBtn');
if (promptLoginBtn) {
    promptLoginBtn.addEventListener('click', () => {
        if (window.careerMode && window.careerMode.openModal) {
            window.careerMode.openModal('login');
        }
    });
}

// Add stagger animation to visible cards on load
document.addEventListener('DOMContentLoaded', () => {
    const visibleCards = Array.from(eventCards).filter(card => card.style.display !== 'none');
    visibleCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
});
