import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'block-constellation-ui';

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['ref']) {
        // Store the ref value with expiration (1 week from now)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // 7 days = 1 week
        
        const referralData = {
          value: params['ref'],
          expiration: expirationDate.getTime() // store as timestamp
        };
        
        localStorage.setItem('referral', JSON.stringify(referralData));
        
        // Create a new URL without the ref parameter
        const urlTree = this.router.createUrlTree([], {
          queryParams: { ...params, ref: null },
          queryParamsHandling: 'merge',
        });
        
        // Navigate to the new URL without the ref parameter
        this.router.navigateByUrl(urlTree);
      }
    });
  }
}
