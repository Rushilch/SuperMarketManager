import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraBarcodeScanner } from '../components/CameraBarcodeScanner';
import { Html5Qrcode } from 'html5-qrcode';
import React from 'react';

vi.mock('html5-qrcode', () => {
  return {
    Html5Qrcode: Object.assign(
      vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn(),
        isScanning: false,
        getRunningTrackCapabilities: vi.fn().mockReturnValue({}),
        applyVideoConstraints: vi.fn().mockResolvedValue(undefined),
      })),
      {
        getCameras: vi.fn().mockResolvedValue([
          { id: 'cam-1', label: 'Front HD Webcam' },
          { id: 'cam-2', label: 'Back Environment Camera' },
        ]),
      }
    ),
    Html5QrcodeSupportedFormats: {
      EAN_13: 'EAN_13',
      EAN_8: 'EAN_8',
      UPC_A: 'UPC_A',
      UPC_E: 'UPC_E',
      CODE_128: 'CODE_128',
      CODE_39: 'CODE_39',
      CODE_93: 'CODE_93',
      QR_CODE: 'QR_CODE',
    },
  };
});

describe('CameraBarcodeScanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CameraBarcodeScanner isOpen={false} onClose={vi.fn()} onScan={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders scanner modal, viewfinder and controls when isOpen is true', async () => {
    const handleClose = vi.fn();
    const handleScan = vi.fn();

    render(
      <CameraBarcodeScanner isOpen={true} onClose={handleClose} onScan={handleScan} />
    );

    expect(screen.getByText(/live barcode scanner/i)).toBeInTheDocument();
    expect(screen.getByText(/position supermarket barcode/i)).toBeInTheDocument();
    expect(screen.getByText(/EAN-13/i)).toBeInTheDocument();
    expect(screen.getByText(/UPC-A/i)).toBeInTheDocument();

    // Close button triggers onClose
    const closeBtn = screen.getByRole('button', { name: /close scanner/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
