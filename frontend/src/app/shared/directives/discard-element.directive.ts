import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[discardElement]',
  standalone: false
})
export class DiscardElementDirective {
  @Output () discardElement = new EventEmitter<'click' | 'escape'> ();

  constructor (private elementRef: ElementRef) {}

  @HostListener ('document:click', ['$event.target'])
  onDocumentClick (target: HTMLElement) {
    if (!this.elementRef.nativeElement.contains (target)) {
      setTimeout (() => this.discardElement.emit ('click')); // defer for safety
    }
  }

  @HostListener ('document:keydown.escape', ['$event'])
  onEscapeKey (event: KeyboardEvent) {
    this.discardElement.emit ('escape');
  }
}
