/**
 * @jest-environment jsdom
 *
 * Tests for DockRackSectionToolbar — barra de secciones de rack.
 * Es un wrapper thin de DockIconBar que pasa 11 botones agrupados
 * en esenciales (3) y avanzados (8) con divisor y label.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { DockRackSectionToolbar } from '../DockRackSectionToolbar';

const defaultProps = {
  rackSections: {
    identity: true,
    essentialIdentity: true,
    identityBranding: true,
    globalUiSkin: true,
    activeConstructionPlane: true,
    moduleTaxonomy: true,
    physicalEmulationProfile: true,
    aestheticsGlobals: true,
    aestheticsElements: true,
    architecture: true,
    diagnostics: true,
  },
  onToggleRackSection: jest.fn(),
};

// ── Rendering ──────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — rendering', () => {
  it('should render the label', () => {
    render(<DockRackSectionToolbar {...defaultProps} />);
    expect(screen.getByText('RACK SECT')).toBeTruthy();
  });

  it('should render 11 section buttons', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(11);
  });

  it('should render all section titles', () => {
    render(<DockRackSectionToolbar {...defaultProps} />);
    expect(screen.getByTitle('Toggle Identity')).toBeTruthy();
    expect(screen.getByTitle('Toggle Essential Identity')).toBeTruthy();
    expect(screen.getByTitle('Toggle Identity Branding')).toBeTruthy();
    expect(screen.getByTitle('Toggle Global UI Skin')).toBeTruthy();
    expect(screen.getByTitle('Toggle Construction Plane')).toBeTruthy();
    expect(screen.getByTitle('Toggle Module Taxonomy')).toBeTruthy();
    expect(screen.getByTitle('Toggle Physical Emulation Profile')).toBeTruthy();
    expect(screen.getByTitle('Toggle Aesthetics Globals')).toBeTruthy();
    expect(screen.getByTitle('Toggle Aesthetics Elements')).toBeTruthy();
    expect(screen.getByTitle('Toggle Architecture')).toBeTruthy();
    expect(screen.getByTitle('Toggle Diagnostics')).toBeTruthy();
  });

  it('should apply the container classes', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('w-10');
    expect(outerDiv.className).toContain('wb-surface');
    expect(outerDiv.className).toContain('animate-in');
  });
});

// ── Groups ──────────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — groups', () => {
  it('should render a divider between essential and advanced groups', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    // Divider is a div with classes w-5 h-px bg-white/10
    // Use getElementsByClassName to avoid CSS selector escaping issues with /
    const allDivs = container.querySelectorAll('div');
    const dividers = Array.from(allDivs).filter(d =>
      d.className.includes('bg-white') && d.className.includes('h-px')
    );
    expect(dividers.length).toBe(1);
  });

  it('should place identity buttons before the divider', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    // First 3 buttons should be essential (identity, essentialIdentity, identityBranding)
    expect(buttons[0].getAttribute('title')).toBe('Toggle Identity');
    expect(buttons[1].getAttribute('title')).toBe('Toggle Essential Identity');
    expect(buttons[2].getAttribute('title')).toBe('Toggle Identity Branding');
  });
});

// ── Active state ────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — active state', () => {
  it('should highlight buttons when rackSections[id] is true', () => {
    render(<DockRackSectionToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.className).toContain('bg-primary/20');
    });
  });

  it('should not highlight buttons when rackSections[id] is false', () => {
    const rackSections = {
      identity: false,
      essentialIdentity: false,
      identityBranding: false,
      globalUiSkin: false,
      activeConstructionPlane: false,
      moduleTaxonomy: false,
      physicalEmulationProfile: false,
      aestheticsGlobals: false,
      aestheticsElements: false,
      architecture: false,
      diagnostics: false,
    };
    render(<DockRackSectionToolbar {...defaultProps} rackSections={rackSections} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.className).toContain('wb-text-muted');
    });
  });

  it('should treat undefined rackSections[id] as active (default enabled)', () => {
    render(
      <DockRackSectionToolbar
        rackSections={{}}
        onToggleRackSection={defaultProps.onToggleRackSection}
      />
    );
    const buttons = screen.getAllByRole('button');
    // undefined !== false → true → active
    buttons.forEach(btn => {
      expect(btn.className).toContain('bg-primary/20');
    });
  });

  it('should show mixed active/inactive states', () => {
    const rackSections = {
      identity: true,
      essentialIdentity: false,
      identityBranding: true,
      globalUiSkin: false,
      activeConstructionPlane: true,
    };
    render(<DockRackSectionToolbar {...defaultProps} rackSections={rackSections} />);
    const buttons = screen.getAllByRole('button');
    // identity → active
    expect(buttons[0].className).toContain('bg-primary/20');
    // essentialIdentity → inactive
    expect(buttons[1].className).toContain('wb-text-muted');
    // identityBranding → active
    expect(buttons[2].className).toContain('bg-primary/20');
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('DockRackSectionToolbar — click handler', () => {
  it('should call onToggleRackSection with the correct section id', () => {
    const onToggleRackSection = jest.fn();
    render(
      <DockRackSectionToolbar {...defaultProps} onToggleRackSection={onToggleRackSection} />
    );
    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]); // identity
    expect(onToggleRackSection).toHaveBeenCalledWith('identity');

    fireEvent.click(buttons[3]); // globalUiSkin
    expect(onToggleRackSection).toHaveBeenCalledWith('globalUiSkin');

    fireEvent.click(buttons[10]); // diagnostics (last)
    expect(onToggleRackSection).toHaveBeenCalledWith('diagnostics');
  });
});

// ── Snapshot ────────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — snapshots', () => {
  it('should match snapshot with all sections active', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with all sections inactive', () => {
    const rackSections = {
      identity: false,
      essentialIdentity: false,
      identityBranding: false,
      globalUiSkin: false,
      activeConstructionPlane: false,
      moduleTaxonomy: false,
      physicalEmulationProfile: false,
      aestheticsGlobals: false,
      aestheticsElements: false,
      architecture: false,
      diagnostics: false,
    };
    const { container } = render(
      <DockRackSectionToolbar {...defaultProps} rackSections={rackSections} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with mixed active/inactive', () => {
    const rackSections = {
      identity: true,
      essentialIdentity: false,
      identityBranding: true,
      globalUiSkin: false,
      activeConstructionPlane: true,
      moduleTaxonomy: false,
      physicalEmulationProfile: true,
      aestheticsGlobals: false,
      aestheticsElements: true,
      architecture: false,
      diagnostics: true,
    };
    const { container } = render(
      <DockRackSectionToolbar {...defaultProps} rackSections={rackSections} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
