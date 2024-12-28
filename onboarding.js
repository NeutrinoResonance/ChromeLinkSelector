document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('affiliateEnabled');
    const button = document.getElementById('getStarted');

    // Save user preference and close onboarding
    button.addEventListener('click', () => {
        chrome.storage.sync.set({
            affiliateEnabled: checkbox.checked,
            onboardingComplete: true
        }, () => {
            window.close();
        });
    });
});
