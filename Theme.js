export const theme = {
    light: {
        background: '#ffffff',
        foreground: '#09090b', // Deep Black/Gray
        card: '#ffffff',
        cardForeground: '#09090b',
        popover: '#ffffff',
        popoverForeground: '#09090b',
        primary: '#09090b',
        primaryForeground: '#ffffff',
        secondary: '#f4f4f5',
        secondaryForeground: '#18181b',
        muted: '#f4f4f5',
        mutedForeground: '#71717a',
        accent: '#f4f4f5',
        accentForeground: '#18181b',
        destructive: '#ef4444', // Strong Red
        destructiveForeground: '#ffffff',
        border: '#e4e4e7',
        input: '#e4e4e7',
        inputBackground: '#ffffff',
        ring: '#18181b',
        radius: 12, // Standard rounding
        // Original Vibrant Chart Colors
        chart1: '#e76e50', // Orange-Red
        chart2: '#2a9d8f', // Teal
        chart3: '#2a6f97', // Blue
        chart4: '#e9c46a', // Yellow/Gold
        chart5: '#f4a261', // Orange
    },
    dark: {
        background: '#09090b',
        foreground: '#fafafa',
        card: '#18181b', // Zinc-900
        cardForeground: '#fafafa',
        primary: '#fafafa',
        primaryForeground: '#18181b',
        secondary: '#27272a',
        secondaryForeground: '#fafafa',
        muted: '#27272a',
        mutedForeground: '#a1a1aa',
        accent: '#27272a',
        accentForeground: '#fafafa',
        destructive: '#7f1d1d',
        destructiveForeground: '#fecaca',
        border: '#27272a',
        input: '#27272a',
        inputBackground: '#09090b',
        ring: '#d4d4d8',
        radius: 12,
        chart1: '#e76e50',
        chart2: '#2a9d8f',
        chart3: '#2a6f97',
        chart4: '#e9c46a',
        chart5: '#f4a261',
    }
};

// Revert to Light Mode default as standard
export const currentTheme = theme.light; 
