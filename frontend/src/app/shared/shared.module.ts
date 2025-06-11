import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { EscapeKeyDirective } from './directives/escape-key.directive';
import { DiscardElementDirective } from './directives/discard-element.directive';

@NgModule({
  declarations: [ClickOutsideDirective, EscapeKeyDirective, DiscardElementDirective],
  exports: [ClickOutsideDirective, EscapeKeyDirective, DiscardElementDirective],
  imports: [CommonModule]
})
export class SharedModule {}
