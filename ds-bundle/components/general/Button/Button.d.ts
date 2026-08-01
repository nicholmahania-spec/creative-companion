import * as React from 'react';

/**
 * Button — from creative-companion-react@2.0.0.
 */
export interface ButtonProps {
children?: React.ReactNode; /** Visual weight. 'outline' is an alias of 'secondary' — both render .btn-secondary. */ variant?: 'primary' | 'secondary' | 'ghost' | 'outline'; /** 'sm' and 'soft' both render .btn-sm; 'md' adds no size class. */ size?: 'md' | 'sm' | 'soft'; /** Appended after the .btn/.btn-* classes, so it wins on conflicts. */ className?: string; onClick?: React.MouseEventHandler<HTMLButtonElement>; /** Any other button attribute is spread onto the underlying <button>. Note the element defaults to type="button"; pass type="submit" to override. */ [key: string]: unknown;
}

export declare const Button: React.ComponentType<ButtonProps>;
