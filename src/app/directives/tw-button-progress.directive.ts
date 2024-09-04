import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: `button[progress]`,
  standalone: true
})
export class TwButtonProgressDirective implements OnChanges {

  constructor(
    private _elRef: ElementRef,
    private _renderer: Renderer2,
  ) { }

  @Input() busy: boolean | string = false;

  #bar: HTMLSpanElement | undefined

  ngOnChanges(changes: SimpleChanges): void {

    const busy = changes['busy']
    if (!busy) { return }

    if (busy.currentValue) {
      this._renderer.setAttribute(this._elRef.nativeElement, 'disabled', '')
      this.#createBar()
    } else if (!busy.firstChange) {
      this._renderer.removeAttribute(this._elRef.nativeElement, 'disabled')
      this.#destroyBar();
    }
  }


  #createBar() {
    this.#bar = document.createElement('span')
    this.#bar.classList.add('bar')
    this._renderer.appendChild(this._elRef.nativeElement, this.#bar);
  }


  #destroyBar(): void {
    if (!this.#bar) { return; }
    this.#bar.remove();
    this.#bar = undefined;
  }

}
