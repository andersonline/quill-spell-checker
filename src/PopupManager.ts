import { createPopper } from "@popperjs/core"
import html from "nanohtml/lib/browser"
import { QuillSpellChecker } from "."
import { MatchesEntity } from "./types"

/**
 * Manager for popups.
 *
 * This handles opening and closing suggestion popups in the editor
 * when a suggestion is selected.
 */
export default class PopupManager {
  private openPopup?: HTMLElement
  private currentSuggestionElement?: HTMLElement

  constructor(private readonly parent: QuillSpellChecker) {
    this.closePopup = this.closePopup.bind(this)
    this.addEventHandler()
  }

  private addEventHandler() {
    this.findRoot(this.parent.quill.root).addEventListener("click", (e) => {
      const target = e.target as HTMLElement
      if (target.tagName === "QUILL-SPCK-MATCH") {
        this.handleSuggestionClick(target)
      } else if (this.openPopup && !this.openPopup?.contains(target)) {
        this.closePopup()
      }
    })

    window.addEventListener("resize", () => {
      if (this.currentSuggestionElement) {
        this.handleSuggestionClick(this.currentSuggestionElement)
      }
    })
  }

  private closePopup() {
    if (this.openPopup) {
      this.openPopup.remove()
      this.openPopup = undefined
    }
    this.currentSuggestionElement = undefined
  }

  private handleSuggestionClick(suggestion: HTMLElement) {
    const offset = parseInt(suggestion.getAttribute("data-offset") || "0")
    const length = parseInt(suggestion.getAttribute("data-length") || "0")
    const id = suggestion?.id?.replace("match-", "")
    const rule = this.parent.matches.find(
      (r) => r.offset === offset && r.length === length && r.id === id
    )
    if (!rule) {
      return
    }
    this.createSuggestionPopup(rule, suggestion)
  }

  private createSuggestionPopup(match: MatchesEntity, suggestion: HTMLElement) {
    if (this.openPopup) {
      this.closePopup()
    }
    this.currentSuggestionElement = suggestion

    const applySuggestion = (replacement: string) => {
      this.parent.preventLoop()
      this.parent.quill.setSelection(match.offset, match.length, "silent")
      this.parent.quill.deleteText(match.offset, match.length, "silent")
      this.parent.quill.insertText(match.offset, replacement, "silent")
      // @ts-ignore
      this.parent.quill.setSelection(
        match.offset + replacement.length,
        "silent"
      )
      this.parent.boxes.removeCurrentSuggestionBox(match, replacement)

      this.closePopup()
    }

    const popup = html`
      <quill-spck-popup role="tooltip">
        <div class="quill-spck-match-popup">
          <div class="quill-spck-match-popup-actions">
            ${match.replacements?.slice(0, 3).map((replacement) => {
              return html`
                <button
                  class="quill-spck-match-popup-action"
                  data-replacement="${replacement.value}"
                  onclick=${() => applySuggestion(replacement.value)}
                >
                  ${replacement.value}
                </button>
              `
            })}
          </div>
        </div>
      </quill-spck-popup>
    `

    document.body.appendChild(popup)

    createPopper(suggestion, popup, {
      placement: "top",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 0],
          },
        },
      ],
    })

    this.openPopup = popup
  }

  private findRoot(element: HTMLElement): HTMLElement {
    let currentElement = element
    while (currentElement.parentNode) {
      currentElement = currentElement.parentNode as HTMLElement
    }
    return currentElement
  }
}
