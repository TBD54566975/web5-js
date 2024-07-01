// script.js
function switchScreen(screenId) {
  // Get all screens
  const screens = document.querySelectorAll('.screen');

  // Hide all screens
  screens.forEach(screen => {
    screen.classList.add('hidden');
  });

  // Show the requested screen
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
  }

  // For screen3, let's populate the profile data
  if (screenId === 'screen3') {
    const displayNameInput = document.getElementById('displayName');
    const profileInitial = document.getElementById('profileIcon');
    const profileName = document.getElementById('profileName');

    if (displayNameInput && displayNameInput.value) {
      const name = displayNameInput.value;
      profileInitial.textContent = name[0]; // first letter of name
      profileName.textContent = name;
    }
  }
}

function createPinCodeForm({ length, value }) {
  const pinEntry = document.querySelector('.pin-entry');
  const inputs = pinEntry.querySelectorAll('input');
  const controller = new AbortController();
  let currentIndex = 0;

  // Set the length of the PIN entry.
  if (length < 3 || length > 10) {
    throw new Error('Invalid PIN length. Must be between 3 and 10 digits.');
  }

  // Hide any input fields beyond the specified length, and set the pattern attribute to allow only numeric characters.
  inputs.forEach((input, index) => {
    if (index >= length) {
      input.style.display = 'none';
    }
    input.setAttribute('pattern', '[0-9]');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('maxlength', '1');
    input.setAttribute('autocomplete', 'one-time-code');
    input.setAttribute('aria-label', 'Please enter your pin code');
    input.setAttribute('placeholder', '');
    input.setAttribute('data-index', index);
  });

  // Set the values of the input fields and disable them if the value parameter is defined.
  if (value) {
    inputs.forEach((input, index) => {
      if (index < value.length) {
        input.value = value[index];
      }
      input.disabled = true;
    });

  } else {

    // Add event listeners to each input.
    inputs.forEach((input, index) => {

      /** Move focus to the next input when a single character is entered, or move focus to the
       * previous input and clear its value when the input is empty. */
      input.addEventListener('input', event => {
        const value = event.target.value;
        if (value.length === 1) {
          // Move focus to the next input when a single character is entered.
          if (index < length - 1) {
            inputs[index + 1].focus();
          }
        } else if (value.length === 0) {
          // Move focus to the previous input and clear its value when the input is empty.
          if (index > 0) {
            inputs[index - 1].value = '';
            inputs[index - 1].focus();
          }
        }
      }, { signal: controller.signal });

      /** Move focus to the previous input and clear its value when the Backspace key is pressed
       * and the input is empty. */
      input.addEventListener('keydown', event => {
        if (event.key === 'Backspace' && input.value.length === 0) {
          if (index > 0) {
            inputs[index - 1].value = '';
            inputs[index - 1].focus();
          }
        }
      }, { signal: controller.signal });

      // Prevent non-numeric characters from being entered.
      input.addEventListener('keypress', event => {
        const keyCode = event.keyCode || event.which;
        const keyValue = String.fromCharCode(keyCode);
        const regex = /[0-9]/;

        if (!regex.test(keyValue)) {
          event.preventDefault();
        }
      }, { signal: controller.signal });

      // Clear all inputs after the current input when the current input is focused.
      input.addEventListener('focus', () => {
        currentIndex = index;
        inputs.forEach((input, index) => {
          if (index >= currentIndex) {
            input.value = '';
          }
        }, { signal: controller.signal });

      });
    });

    // Set focus on the first input.
    inputs[0].focus();
  }

  const getValue = () => {
    let pin = '';
    inputs.forEach((input, index) => {
      if (index < length) {
        pin += input.value;
      }
    });

    return pin;
  };

  return {
    getValue           : getValue,
    removeAllListeners : controller.abort.bind(controller)
  };
}

// Sample initialization code, just to make sure script.js is linked and working
document.addEventListener('DOMContentLoaded', function() {
  console.log('JavaScript linked and working!');
});