import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar';
import { SocialRowComponent } from './social-row/social-row';
import { DownloaderComponent } from './downloader/downloader';
import { FeaturesComponent } from './features/features';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, SocialRowComponent, DownloaderComponent, FeaturesComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'media-downloader';
}
