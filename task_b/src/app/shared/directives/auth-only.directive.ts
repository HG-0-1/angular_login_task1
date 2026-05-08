import { Directive, ElementRef, OnInit , Renderer2}from '@angular/core'
import {AuthService } from '../../core/services/auth.service';
@Directive({
    selector: '[authOnly]',
    standalone: true
})
export class AuthOnlyDirective implements OnInit{
    constructor(
        private element: ElementRef,
        private authService: AuthService,
        private rendrer: Renderer2
    ){}
    ngOnInit(): void {
        if(!this.authService.isLoggedIn()){
            this.rendrer.setStyle(
                this.element
            )
            }
    }
}