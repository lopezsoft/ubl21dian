<?php

namespace ubl21dian\XAdES;

/**
 * Sign Invoice.
 */
class SignEvent extends SignInvoice
{
    /**
     * NS.
     *
     * @var array
     */
    public $ns = [
        'xmlns:cac' => 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:ext' => 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        'xmlns:cbc' => 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        'xmlns:sts' => 'urn:dian:gov:co:facturaelectronica:Structures-2-1',
        'xmlns' => 'urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2',
        'xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:xades141' => 'http://uri.etsi.org/01903/v1.4.1#',
        'xmlns:xades' => 'http://uri.etsi.org/01903/v1.3.2#',
        'xmlns:ds' => SignInvoice::XMLDSIG,
    ];
}
