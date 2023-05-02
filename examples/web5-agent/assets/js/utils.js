function setStdoutRowCounts(dateType) {
  const stdoutElements = document.querySelectorAll(`[data-type="${dateType}"]`);

  stdoutElements.forEach((element) => {
    const stdoutScrollerElement = element.querySelector(':scope div.stdout-scroller');
    const stdoutRowElements = stdoutScrollerElement.querySelectorAll(':scope > div');
    const stdoutRowCount = stdoutRowElements.length;

    const stdoutLineCountElement = element.querySelector(':scope div.stdout-line-count');
    stdoutLineCountElement.textContent = `* ${stdoutRowCount} row${stdoutRowCount == 1 ? '' : 's' }`;
  });
}

function generateStdoutElement(containerId, title) {
  const containerElement = document.querySelector(`#${containerId}`);

  // Create header element.
  const stdoutHeader = document.createElement('div');
  stdoutHeader.classList.add('stdout-header');
  stdoutHeader.classList.add('stdout-clear');
  const stdoutHeaderLeft = document.createElement('div');
  stdoutHeaderLeft.classList.add('stdout-left');
  stdoutHeaderLeft.textContent = title;
  const stdoutHeaderRight = document.createElement('div');
  stdoutHeaderRight.classList.add('stdout-right');
  stdoutHeaderRight.classList.add('stdout-line-count');
  stdoutHeader.appendChild(stdoutHeaderLeft);
  stdoutHeader.appendChild(stdoutHeaderRight);

  // Create scroller element.
  const stdoutScroller = document.createElement('div');
  stdoutScroller.classList.add('stdout-scroller');

  // Create wrapper element
  const stdoutWrapper = document.createElement('div');
  stdoutWrapper.classList.add('stdout-wrapper');
  stdoutWrapper.appendChild(stdoutHeader);
  stdoutWrapper.appendChild(stdoutScroller);

  // Create container element.
  const stdoutContainer = document.createElement('div');
  stdoutContainer.dataset.title = title;
  stdoutContainer.dataset.type = 'stdout';
  stdoutContainer.appendChild(stdoutWrapper);

  containerElement.appendChild(stdoutContainer);
}

function appendStdoutLine(containerId, lineContent) {
  const containerElement = document.querySelector(`#${containerId}`);
  const stdoutScrollerElement = containerElement.querySelector(':scope div.stdout-scroller');

  // Count the number of existing output rows.
  const stdoutRowElements = stdoutScrollerElement.querySelectorAll(':scope > div');
  const stdoutRowCount = stdoutRowElements.length;

  // Create line container element.
  const stdoutLineContainer = document.createElement('div');
  stdoutLineContainer.classList.add('stdout-line-wrap');
  stdoutLineContainer.dataset.line = stdoutRowCount + 1;
  
  // Create line element.
  const stdoutLine = document.createElement('div');
  stdoutLine.classList.add('stdout-line-code');
  stdoutLine.classList.add('stdout-nowrap');
  stdoutLine.textContent = lineContent;

  // Append elements.
  stdoutLineContainer.appendChild(stdoutLine);
  stdoutScrollerElement.appendChild(stdoutLineContainer);
}
