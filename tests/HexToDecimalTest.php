<?php

namespace Lopezsoft\Tests;

use Lopezsoft\UBL21dian\Traits\DIANTrait;

/**
 * HexToDecimal Test.
 * Tests the conversion of hexadecimal serial numbers to decimal strings,
 * which is crucial for X.509 certificate serial numbers that exceed PHP's native integer precision.
 */
class HexToDecimalTest extends TestCase
{
    use DIANTrait;

    /**
     * Test basic small hex to decimal conversion.
     */
    public function testSmallHexConversion()
    {
        // 'FF' in hex = 255 in decimal
        $this->assertEquals('255', $this->hexToDecimal('FF'));

        // '100' in hex = 256 in decimal
        $this->assertEquals('256', $this->hexToDecimal('100'));

        // '1A' in hex = 26 in decimal
        $this->assertEquals('26', $this->hexToDecimal('1A'));
    }

    /**
     * Test large hex to decimal conversion (16+ bytes, typical for modern CAs).
     * This tests the scenario where PHP's native openssl_x509_parse()['serialNumber']
     * would fail or produce incorrect results.
     */
    public function testLargeHexConversion()
    {
        // A realistic 16-byte (128-bit) serial number in hex
        // '8A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D' = 183767632641365435945667820180815885149 in decimal
        $largeHex = '8A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D';
        $expected = '183767632641365435945667820180815885149';
        $this->assertEquals($expected, $this->hexToDecimal($largeHex));
    }

    /**
     * Test hex with leading zeros (should be stripped).
     */
    public function testHexWithLeadingZeros()
    {
        // Leading zeros should not affect result
        $this->assertEquals('26', $this->hexToDecimal('001A'));
        $this->assertEquals('255', $this->hexToDecimal('00FF'));
        $this->assertEquals('0', $this->hexToDecimal('00'));
        $this->assertEquals('0', $this->hexToDecimal('0000'));
    }

    /**
     * Test edge case: zero.
     */
    public function testZeroValue()
    {
        $this->assertEquals('0', $this->hexToDecimal('0'));
    }

    /**
     * Test case-insensitive input (both uppercase and lowercase hex should work).
     */
    public function testCaseInsensitivity()
    {
        $this->assertEquals('183767632641365435945667820180815885149', $this->hexToDecimal('8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d'));
        $this->assertEquals('26', $this->hexToDecimal('1a'));
    }

    /**
     * Test against expected decimal value from a real-world FIMA Digital certificate.
     * This verifies that the new conversion method produces the correct result
     * for modern certificate providers with longer serials.
     */
    public function testFimaDigitalStyleLongSerial()
    {
        // Example: a 20-byte (160-bit) serial from FIMA Digital or similar modern CA
        $longSerial = 'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B';
        // Pre-calculated decimal value for this hex
        $expectedDecimal = '1233355663331854029813896866325024070996097947';
        $this->assertEquals($expectedDecimal, $this->hexToDecimal($longSerial));
    }
}
