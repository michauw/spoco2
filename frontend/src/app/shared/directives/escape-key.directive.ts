import { Directive, HostListener, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[escapeKey]',
  standalone: false
})
export class EscapeKeyDirective {
  @Output () escapeKey = new EventEmitter<void> ();

  @HostListener ('document:keydown.escape', ['$event'])
  onEscapeKey (event: KeyboardEvent) {
    this.escapeKey.emit ();
  }
}
