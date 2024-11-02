// ==UserScript==
// @name         replyguy/acc signature
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  save your keyboard from 14 additional keystrokes after each comment
// @author       @hikipilling
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

const toggleDivHTML = `
    <div class="css-175oi2r r-sdzlij r-dnmrzs r-1awozwy r-18u37iz r-1777fci r-xyw6el r-o7ynqc r-6416eg">
      <div class="css-175oi2r">
        <button id="replyGuyToggle">🗣</button>
      </div>
    </div>
`;

(function () {
  'use strict';

  const SIGNATURE = 'replyguy/acc';
  let isAddingSignature = false;
  let isReplyGuyModeEnabled = localStorage.getItem("ReplyGuyMode") ?? "disabled";
  let replyGuyButtonAdded = false;
  isReplyGuyModeEnabled = isReplyGuyModeEnabled === "enabled";



  function debugLog(message, data = '') {
    console.log(`%c[Reply Signature Debug] ${message}`, 'color: #00a1f3', data);
  }

  function addSignature(editor) {
    const selection = window.getSelection();
    const range = document.createRange();

    const textNodes = [];
    function findTextNodes(node) {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          textNodes.push(child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.childNodes.length > 0) {
          findTextNodes(child);
        }
      }
    }
    findTextNodes(editor);

    const lastTextNode = textNodes[textNodes.length - 1];
    if (lastTextNode) {
      range.setStart(lastTextNode, lastTextNode.textContent.length);
      range.setEnd(lastTextNode, lastTextNode.textContent.length);
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);

    editor.focus();
    for (let i = 0; i < 2; i++) {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        keyCode: 13
      });
      editor.dispatchEvent(enterEvent);
      document.execCommand('insertParagraph');
    }

    document.execCommand('insertText', false, SIGNATURE.trim());

    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function processEditor(editorDiv) {
    if (editorDiv.dataset.signatureProcessed) return;
    editorDiv.dataset.signatureProcessed = 'true';

    debugLog('New editor detected:', editorDiv);

    document.addEventListener('click', (e) => {
      const replyButton = e.target.closest('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
      if (!replyButton || isAddingSignature || replyButton.getAttribute('aria-disabled') === 'true') return;

      const isReply = Array.from(editorDiv.closest('[role="dialog"]')?.querySelectorAll('*') || editorDiv.closest('[data-testid="inline_reply_offscreen"]')?.querySelectorAll('*') || [])
        .some(el => el.textContent?.includes('Replying to'));

      debugLog('Is reply check:', isReply);

      if (!isReply) {
        debugLog('Not a reply, skipping signature');
        return;
      }

      const draftEditor = editorDiv.querySelector('[contenteditable="true"]');
      if (!draftEditor || !isReplyGuyModeEnabled || !draftEditor.textContent || draftEditor.textContent.endsWith(SIGNATURE)) return;

      debugLog('Reply button clicked, adding signature');

      e.preventDefault();
      e.stopPropagation();

      isAddingSignature = true;

      try {
        addSignature(draftEditor);

        setTimeout(() => {
          debugLog('Triggering delayed click');
          replyButton.click();
          isAddingSignature = false;
        }, 100);
      } catch (error) {
        debugLog('Error adding signature:', error);
        isAddingSignature = false;
        replyButton.click();
      }
    }, true);
  }


  // Button section

  function getReplyToggleBackground() {
    return isReplyGuyModeEnabled ? "green" : "gray";
  }

  function toggleNavElement() {
    // Toggle the variable state
    isReplyGuyModeEnabled = !isReplyGuyModeEnabled;

    // Save the new state to localStorage
    localStorage.setItem("ReplyGuyMode", isReplyGuyModeEnabled ? "enabled" : "disabled");

    const toggleDiv = document.getElementById("replyGuyToggle");

    // Change background color based on the toggle state
    if (toggleDiv) {
      toggleDiv.style.backgroundColor = getReplyToggleBackground()
    }
  }

  function addToggleDiv(element) {
    const divContainer = document.createElement("div");
    divContainer.id = "toggleReplyGuyMode";
    divContainer.className = "css-175oi2r r-6koalj r-eqz5dr r-16y2uox r-1habvwh r-13qz1uu r-1mkv55d r-1ny4l3l r-1loqt21";
    divContainer.style.display = "block";

    divContainer.innerHTML = toggleDivHTML;

    // Append the toggle div
    element.appendChild(divContainer);

    // Add event listener to the button
    const button = document.getElementById("replyGuyToggle");
    button.style.backgroundColor = getReplyToggleBackground();
    button.addEventListener('click', toggleNavElement);

    replyGuyButtonAdded = true;
  }


  const mainObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const navElement = document.querySelector(
            'nav.css-175oi2r.r-eqz5dr.r-1habvwh[role="navigation"], nav.css-175oi2r.r-1awozwy.r-eqz5dr[role="navigation"]'
          );
          const editors = node.querySelectorAll('[data-testid="tweetTextarea_0RichTextInputContainer"], [data-testid="tweetTextarea_0"]');
          if (editors.length > 0) {
            debugLog(`Found ${editors.length} editor(s)`);
            editors.forEach(processEditor);
          }
          if (navElement && !replyGuyButtonAdded) {
            addToggleDiv(navElement);
          }
        }
      });
    });
  });

  mainObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  debugLog('Script initialized');
})();
