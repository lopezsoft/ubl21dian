<?php

namespace Stenfrank\UBL21dian\XAdES;

use DOMXPath;
use DOMDocument;
use Carbon\Carbon;
use Stenfrank\UBL21dian\XAdES\SignPayroll;

/**
 * Sign Invoice.
 */
class SignPayrollAdjustment extends SignPayroll
{

    /**
     * NS.
     *
     * @var array
     */
    public $ns = [
        'xmlns:xs' => 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:ext' => 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        'xmlns' => 'urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste',
        'xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:xades141' => 'http://uri.etsi.org/01903/v1.4.1#',
        'xmlns:xades' => 'http://uri.etsi.org/01903/v1.3.2#',
        'xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:ds' => self::XMLDSIG,
    ];
}
