import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [],
  templateUrl: './features.html',
  styleUrl: './features.css'
})
export class FeaturesComponent implements OnInit {
  features = [
    {
      title: 'Ultra High Quality',
      description: 'Extract and download media in up to 4K resolution with zero loss in quality.',
      icon: 'stars',
      color: '#ff00d4'
    },
    {
      title: 'Fast Extraction',
      description: 'Our advanced engine analyzes and fetches direct download links in seconds.',
      icon: 'lightning-charge',
      color: '#00ccff'
    },
    {
      title: 'Zero Ads',
      description: 'Clean, professional interface with no annoying pop-ups or hidden trackers.',
      icon: 'shield-check',
      color: '#00ffaa'
    },
    {
      title: 'Multi-Format',
      description: 'Choose from various formats including MP4, MKV, and MP3 extraction.',
      icon: 'file-earmark-play',
      color: '#ffd000'
    }
  ];

  ngOnInit() {
    this.animateFeatures();
  }

  animateFeatures() {
    gsap.from('.feature-card', {
      scrollTrigger: {
        trigger: '.features-grid',
        start: 'top 80%'
      },
      y: 100,
      opacity: 0,
      stagger: 0.2,
      duration: 1,
      ease: 'power3.out'
    });
  }
}
