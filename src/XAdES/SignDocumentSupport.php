<?php

namespace Stenfrank\UBL21dian\XAdES;

/**
 * Sign Invoice.
 */
class SignDocumentSupport extends SignInvoice
{
    /**
     * NS.
     *
     * @var array
     */
    public $ns = [
        'xmlns:cac'         => "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
        'xmlns:cbc'         => "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
        'xmlns:ds'          => "http://www.w3.org/2000/09/xmldsig#",
        'xmlns:ext'         => "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
        'xmlns:sts'         => "dian:gov:co:facturaelectronica:Structures-2-1",
        'xmlns:xades'       => "http://uri.etsi.org/01903/v1.3.2#",
        'xmlns:xades141'    => "http://uri.etsi.org/01903/v1.4.1#",
        'xmlns:xsi'         => "http://www.w3.org/2001/XMLSchema-instance",
    ];
}
