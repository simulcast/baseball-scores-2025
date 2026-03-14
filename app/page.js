import HomeClient from '../src/components/HomeClient';

export const metadata = {
  title: 'Baseball Scores | ambient soundtracks for the national pastime',
  description: 'ambient soundtracks for the national pastime',
  openGraph: {
    title: 'Baseball Scores | ambient soundtracks for the national pastime',
    description: 'ambient soundtracks for the national pastime',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Baseball Scores | ambient soundtracks for the national pastime',
    description: 'ambient soundtracks for the national pastime',
    images: ['/api/og'],
  },
};

export default function Home() {
  return <HomeClient />;
}
