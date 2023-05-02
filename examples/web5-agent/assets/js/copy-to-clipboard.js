export function initCodeCopy() {
  const codeBlocks = document.querySelectorAll('code[class*="language-"]');

  codeBlocks.forEach((block) => {
    const lang = parseLanguage(block);
    const blockParent = block.parentElement;
    const parentOfBlockParent = block.parentElement.parentElement;

    // Only add <div class="code-wrapper"> to code blocks and not inline code snippets.
    if (blockParent.tagName === 'PRE') {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-wrapper';
      parentOfBlockParent.insertBefore(wrapper, blockParent);
      wrapper.append(block.parentElement);
  
      const copyBtn = document.createElement('button');
      copyBtn.setAttribute('class', 'copy-button');
      copyBtn.setAttribute('data-lang', lang);
      copyBtn.innerHTML = `${lang} <svg viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"/><path d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1.001 1.001 0 0 1 3 21l.003-14c0-.552.45-1 1.007-1H7zM5.003 8L5 20h10V8H5.003zM9 6h8v10h2V4H9v2z" fill="currentColor"/></svg>`;
  
      wrapper.insertAdjacentElement('beforeend', copyBtn);
    }
  });

  function parseLanguage(block) {
    const className = block.className;
    if (className.startsWith('language')) {
      const [_prefix, lang] = className.split('-');
      return lang;
    }
  }

  function copy(e) {
    const btn = e.currentTarget;
    const lang = btn.dataset.lang;

    const text = e.currentTarget.previousSibling.children[0].textContent;

    navigator.clipboard.writeText(text)
      .then(
        () => {
          btn.innerHTML = `copied! <svg viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"/><path d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1.001 1.001 0 0 1 3 21l.003-14c0-.552.45-1 1.007-1H7zm2 0h8v10h2V4H9v2z" fill="currentColor"/></svg>`;
          btn.setAttribute('style', 'opacity: 1');
        },
        () => alert('failed to copy'),
      );

    setTimeout(() => {
      btn.removeAttribute('style');
      btn.innerHTML = `${lang} <svg viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"/><path d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1.001 1.001 0 0 1 3 21l.003-14c0-.552.45-1 1.007-1H7zM5.003 8L5 20h10V8H5.003zM9 6h8v10h2V4H9v2z" fill="currentColor"/></svg>`;
    }, 3000);
  }

  const copyButtons = document.querySelectorAll('.copy-button');

  copyButtons.forEach((btn) => {
    btn.addEventListener('click', copy);
  });
}
