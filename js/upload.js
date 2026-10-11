// Upload Screen Form Handler & File Selector Listener
document.addEventListener('DOMContentLoaded', () => {
    setupMediaPickerListener();
});

function setupMediaPickerListener() {
    const mediaPicker = document.getElementById('fbMediaPicker');
    if (mediaPicker) {
        mediaPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const nameDisplay = document.getElementById('selectedMediaName');
                if (nameDisplay) nameDisplay.innerText = `ရွေးပြီး: ${file.name}`;
                compressImageFile(file, (base64) => { tempFbMediaData = base64; });
            }
        });
    }
}
