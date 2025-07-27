document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('closeBtn');

    // Handle close button
    closeBtn.addEventListener('click', function() {
        window.close();
    });

    // Prevent window from closing when clicking outside
    document.addEventListener('click', function(e) {
        // Prevent any clicks from closing the window
        e.stopPropagation();
    });

    // Prevent window from being closed by user interaction outside
    window.addEventListener('beforeunload', function(e) {
        // This prevents the window from closing when user clicks outside
        // The window will only close when the close button is clicked
        return false;
    });

    console.log('Coin not found popup loaded');
}); 