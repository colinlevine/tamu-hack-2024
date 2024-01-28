function removeFirstElement() {
    /*var element = document.getElementById('first');
    if (element) {
        element.remove();
    }*/
    var elements = document.querySelectorAll('.row.mb-3');
    elements.forEach(function(element) {
        element.remove();
    });


    var element2 = document.getElementById('save-first');

    if (element2) {
        element2.remove();
    }

}

function removeSave() {
    var element2 = document.getElementById('save-first');
    if (element2) {
        element2.remove();
    }

}

function removeUUID() {
    var element3 = document.getElementById('uuid-box');
    if (element3) {
        element3.remove();
    }
}

document.body.addEventListener('htmx:afterSwap', function(event) {
    if (event.target.id === 'chat-box') {
        // Clear the input field if the chat box was updated
        document.querySelector('input[name="message"]').value = '';
    }
});


function fadeIn(elementId) {
    var element = document.getElementById(elementId);
    if (element) {
        element.classList.add('fade-in');
    }
}

function removeUUIDError() {
    var elements = document.querySelectorAll('.UUID-error');
    elements.forEach(function(element) {
        element.remove();
    });
}
