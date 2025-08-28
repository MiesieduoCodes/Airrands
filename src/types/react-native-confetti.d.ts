declare module 'react-native-confetti' {
  import { Component, RefObject } from 'react';

  interface ConfettiProps {
    count?: number;
    origin?: { x: number; y: number };
    fallSpeed?: number;
    fadeOut?: boolean;
    autoStart?: boolean;
    ref?: RefObject<any>;
  }

  export default class Confetti extends Component<ConfettiProps> {}
}
