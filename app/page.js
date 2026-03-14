import HomeClient from '../src/components/HomeClient';

export const metadata = {
  title: 'Baseball Scores | Live MLB Games',
  description: 'Live MLB baseball scores with generative ambient music. Track every game in real time.',
  openGraph: {
    title: 'Baseball Scores | Live MLB Games',
    description: 'Live MLB baseball scores with generative ambient music.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Baseball Scores | Live MLB Games',
    description: 'Live MLB baseball scores with generative ambient music.',
    images: ['/api/og'],
  },
};

export default function Home() {
  return <HomeClient />;
}
