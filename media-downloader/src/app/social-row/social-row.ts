import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface SocialMedia {
  name: string;
  icon: string;
  color: string;
  glow: string;
}

@Component({
  selector: 'app-social-row',
  standalone: true,
  imports: [],
  templateUrl: './social-row.html',
  styleUrl: './social-row.css'
})
export class SocialRowComponent implements OnInit {
  socials: SocialMedia[] = [
    { name: 'YouTube', icon: 'youtube', color: '#ff0000', glow: 'rgba(255, 0, 0, 0.5)' },
    { name: 'Instagram', icon: 'instagram', color: '#e4405f', glow: 'rgba(228, 64, 95, 0.5)' },
    { name: 'X', icon: 'twitter-x', color: '#000000', glow: 'rgba(0, 0, 0, 0.5)' },
    { name: 'Reddit', icon: 'reddit', color: '#ff4500', glow: 'rgba(255, 69, 0, 0.5)' },
    { name: 'Pinterest', icon: 'pinterest', color: '#bd081c', glow: 'rgba(189, 8, 28, 0.5)' },
    { name: 'Facebook', icon: 'facebook', color: '#1877f2', glow: 'rgba(24, 119, 242, 0.5)' }
  ];

  ngOnInit() {
    this.animateSocials();
  }

  animateSocials() {
    gsap.from('.social-card', {
      scale: 0.5,
      opacity: 0,
      y: 50,
      stagger: 0.1,
      duration: 1,
      ease: 'back.out(1.7)',
      delay: 1
    });
  }

  getIconClass(icon: string): string {
    return `bi bi-${icon}`;
  }
}
