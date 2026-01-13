import { Component, OnInit, Optional } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoAutoLoginService } from './services/demo-auto-login.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: ` <router-outlet></router-outlet> `,
    styles: [],
    standalone: true
})
export class AppComponent implements OnInit {
  title = 'Termageddon';

  constructor(@Optional() private demoAutoLoginService: DemoAutoLoginService) {}

  ngOnInit(): void {
    // The DemoAutoLoginService will automatically check for auto-login
    // if demo mode is enabled (via window['DEMO_MODE'] or URL parameters)
  }
}
