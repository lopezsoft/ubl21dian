<?php

namespace Lopezsoft\UBL21dian\XAdES;

use DOMXPath;
use DOMDocument;
use Carbon\Carbon;
use Exception;
use Lopezsoft\UBL21dian\Sign;

/**
 * Sign Invoice.
 */
class SignPayroll extends Sign
{
    /**
     * XMLDSIG.
     *
     * @var string
     */
    const XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#';

    /**
     * POLITICA_FIRMA_V2.
     *
     * @var string
     */
    const POLITICA_FIRMA_V2 = 'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf';

    /**
     * POLITICA_FIRMA_V2_VALUE.
     *
     * @var string
     */
    const POLITICA_FIRMA_V2_VALUE = 'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=';

    /**
     * C14N.
     *
     * @var string
     */
    const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

    /**
     * ENVELOPED_SIGNATURE.
     *
     * @var string
     */
    const ENVELOPED_SIGNATURE = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

    /**
     * SIGNED_PROPERTIES.
     *
     * @var string
     */
    const SIGNED_PROPERTIES = 'http://uri.etsi.org/01903#SignedProperties';

    /**
     * ALGO_SHA1.
     *
     * @var array
     */
    const ALGO_SHA1 = [
        'rsa' => 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha1',
        'algorithm' => 'http://www.w3.org/2001/04/xmlenc#sha1',
        'sign' => OPENSSL_ALGO_SHA1,
        'hash' => 'sha1',
    ];

    /**
     * ALGO_SHA256.
     *
     * @var array
     */
    const ALGO_SHA256 = [
        'rsa' => 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
        'algorithm' => 'http://www.w3.org/2001/04/xmlenc#sha256',
        'sign' => OPENSSL_ALGO_SHA256,
        'hash' => 'sha256',
    ];

    /**
     * ALGO_SHA512.
     *
     * @var array
     */
    const ALGO_SHA512 = [
        'rsa' => 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
        'algorithm' => 'http://www.w3.org/2001/04/xmlenc#sha512',
        'sign' => OPENSSL_ALGO_SHA512,
        'hash' => 'sha512',
    ];

    /**
     * IDS.
     *
     * @var array
     */
    protected $ids = [
        'SignedPropertiesID'    => 'SIGNED-PROPS',
        'SignatureValueID'      => 'SIG-VALUE',
        'SignatureID'           => 'MATIAS-API',
        'KeyInfoID'             => 'KEY-INFO',
        'ReferenceID'           => 'REF',
    ];

    /**
     * NS.
     *
     * @var array
     */
    public $ns = [
        'xmlns' => 'dian:gov:co:facturaelectronica:NominaIndividual',
        'xmlns:ds' => self::XMLDSIG,
        'xmlns:ext' => 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        'xmlns:xades' => 'http://uri.etsi.org/01903/v1.3.2#',
        'xmlns:xades141' => 'http://uri.etsi.org/01903/v1.4.1#',
        'xmlns:xs' => 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:xsi' => 'http://www.w3.org/2001/XMLSchema-instance'
    ];

    /**
     * Result signature.
     *
     * @var mixed
     */
    public $resultSignature;


    public function __construct($pathCertificate = null, $passwords = null, $xmlString = null, $algorithm = self::ALGO_SHA256)
    {
        $this->algorithm = $algorithm;

        parent::__construct($pathCertificate, $passwords, $xmlString);

        return $this;
    }

    /**
     * Load XML.
     */
    protected function loadXML()
    {
        if ($this->xmlString instanceof DOMDocument) {
            $this->xmlString = $this->xmlString->saveXML();
        }

        $this->domDocument = new DOMDocument($this->version, $this->encoding);
        $this->domDocument->loadXML($this->xmlString);

        // DOMX path
        $this->domXPath = new DOMXPath($this->domDocument);

        // Software security code
        $this->softwareSecurityCode();

        // Set CUNE
        $this->setCUNE();

        // Digest value xml clean
        $this->digestValueXML();

        $this->extensionContentSing = $this->domDocument->documentElement->getElementsByTagName('ExtensionContent')->item(0);

        $this->signature = $this->domDocument->createElement('ds:Signature');
        $this->signature->setAttribute('xmlns:ds', self::XMLDSIG);
        $this->signature->setAttribute('Id', $this->SignatureID);
        $this->extensionContentSing->appendChild($this->signature);

        // Signed info
        $this->signedInfo = $this->domDocument->createElement('ds:SignedInfo');
        $this->signature->appendChild($this->signedInfo);

        // Signature value not value
        $this->signatureValue = $this->domDocument->createElement('ds:SignatureValue', 'ERROR!');
        $this->signatureValue->setAttribute('Id', $this->SignatureValueID);
        $this->signature->appendChild($this->signatureValue);

        // Key info
        $this->keyInfo = $this->domDocument->createElement('ds:KeyInfo');
        $this->keyInfo->setAttribute('Id', $this->KeyInfoID);
        $this->signature->appendChild($this->keyInfo);

        $this->X509Data = $this->domDocument->createElement('ds:X509Data');
        $this->keyInfo->appendChild($this->X509Data);

        $this->X509Certificate = $this->domDocument->createElement('ds:X509Certificate', $this->x509Export());
        $this->X509Data->appendChild($this->X509Certificate);

        // Object
        $this->object = $this->domDocument->createElement('ds:Object');
        $this->signature->appendChild($this->object);

        $this->qualifyingProperties = $this->domDocument->createElement('xades:QualifyingProperties');
        $this->qualifyingProperties->setAttribute('Target', "#{$this->SignatureID}");
        $this->object->appendChild($this->qualifyingProperties);

        $this->signedProperties = $this->domDocument->createElement('xades:SignedProperties');
        $this->signedProperties->setAttribute('Id', $this->SignedPropertiesID);
        $this->qualifyingProperties->appendChild($this->signedProperties);

        $this->signedSignatureProperties = $this->domDocument->createElement('xades:SignedSignatureProperties');
        $this->signedProperties->appendChild($this->signedSignatureProperties);

        $this->signingTime = $this->domDocument->createElement('xades:SigningTime', Carbon::now('America/Bogota')->format('Y-m-d\TH:i:s.vP'));
        $this->signedSignatureProperties->appendChild($this->signingTime);

        $this->signingCertificate = $this->domDocument->createElement('xades:SigningCertificate');
        $this->signedSignatureProperties->appendChild($this->signingCertificate);

        // Cert
        $this->cert = $this->domDocument->createElement('xades:Cert');
        $this->signingCertificate->appendChild($this->cert);

        $this->certDigest = $this->domDocument->createElement('xades:CertDigest');
        $this->cert->appendChild($this->certDigest);

        $this->digestMethodCert = $this->domDocument->createElement('ds:DigestMethod');
        $this->digestMethodCert->setAttribute('Algorithm', $this->algorithm['algorithm']);
        $this->certDigest->appendChild($this->digestMethodCert);

        $this->DigestValueCert = base64_encode(openssl_x509_fingerprint($this->certs['cert'], $this->algorithm['hash'], true));

        $this->digestValueCert = $this->domDocument->createElement('ds:DigestValue', $this->DigestValueCert);
        $this->certDigest->appendChild($this->digestValueCert);

        $this->issuerSerialCert = $this->domDocument->createElement('xades:IssuerSerial');
        $this->cert->appendChild($this->issuerSerialCert);

        $this->X509IssuerNameCert = $this->domDocument->createElement('ds:X509IssuerName', $this->joinArray(array_reverse(openssl_x509_parse($this->certs['cert'])['issuer']), false, ','));
        $this->issuerSerialCert->appendChild($this->X509IssuerNameCert);

        $this->X509SerialNumberCert = $this->domDocument->createElement('ds:X509SerialNumber', openssl_x509_parse($this->certs['cert'])['serialNumber']);
        $this->issuerSerialCert->appendChild($this->X509SerialNumberCert);

        $this->signaturePolicyIdentifier = $this->domDocument->createElement('xades:SignaturePolicyIdentifier');
        $this->signedSignatureProperties->appendChild($this->signaturePolicyIdentifier);

        $this->signaturePolicyId = $this->domDocument->createElement('xades:SignaturePolicyId');
        $this->signaturePolicyIdentifier->appendChild($this->signaturePolicyId);

        $this->sigPolicyId = $this->domDocument->createElement('xades:SigPolicyId');
        $this->signaturePolicyId->appendChild($this->sigPolicyId);

        $this->identifier = $this->domDocument->createElement('xades:Identifier', self::POLITICA_FIRMA_V2);
        $this->sigPolicyId->appendChild($this->identifier);

        $this->sigPolicyHash = $this->domDocument->createElement('xades:SigPolicyHash');
        $this->signaturePolicyId->appendChild($this->sigPolicyHash);

        $this->digestMethodPolicy = $this->domDocument->createElement('ds:DigestMethod');
        $this->digestMethodPolicy->setAttribute('Algorithm', $this->algorithm['algorithm']);
        $this->sigPolicyHash->appendChild($this->digestMethodPolicy);

        $this->digestValuePolicy = $this->domDocument->createElement('ds:DigestValue', self::POLITICA_FIRMA_V2_VALUE);
        $this->sigPolicyHash->appendChild($this->digestValuePolicy);

        $this->signerRole = $this->domDocument->createElement('xades:SignerRole');
        $this->signedSignatureProperties->appendChild($this->signerRole);

        $this->claimedRoles = $this->domDocument->createElement('xades:ClaimedRoles');
        $this->signerRole->appendChild($this->claimedRoles);

        $this->claimedRole = $this->domDocument->createElement('xades:ClaimedRole', 'supplier');
        $this->claimedRoles->appendChild($this->claimedRole);

        // Signed info nodes
        $this->canonicalizationMethod = $this->domDocument->createElement('ds:CanonicalizationMethod');
        $this->canonicalizationMethod->setAttribute('Algorithm', self::C14N);
        $this->signedInfo->appendChild($this->canonicalizationMethod);

        $this->signatureMethod = $this->domDocument->createElement('ds:SignatureMethod');
        $this->signatureMethod->setAttribute('Algorithm', $this->algorithm['rsa']);
        $this->signedInfo->appendChild($this->signatureMethod);

        $this->referenceXML = $this->domDocument->createElement('ds:Reference');
        $this->referenceXML->setAttribute('Id', $this->ReferenceID);
        $this->referenceXML->setAttribute('URI', '');
        $this->signedInfo->appendChild($this->referenceXML);

        $this->transformsXML = $this->domDocument->createElement('ds:Transforms');
        $this->referenceXML->appendChild($this->transformsXML);

        $this->transformXML = $this->domDocument->createElement('ds:Transform');
        $this->transformXML->setAttribute('Algorithm', self::ENVELOPED_SIGNATURE);
        $this->transformsXML->appendChild($this->transformXML);

        $this->digestMethodXML = $this->domDocument->createElement('ds:DigestMethod');
        $this->digestMethodXML->setAttribute('Algorithm', $this->algorithm['algorithm']);
        $this->referenceXML->appendChild($this->digestMethodXML);

        $this->digestValueXML = $this->domDocument->createElement('ds:DigestValue', $this->DigestValueXML);
        $this->referenceXML->appendChild($this->digestValueXML);

        $this->domDocumentReferenceKeyInfoC14N = new DOMDocument($this->version, $this->encoding);
        $this->domDocumentReferenceKeyInfoC14N->loadXML(str_replace('<ds:KeyInfo ', "<ds:KeyInfo {$this->joinArray($this->ns)} ", $this->domDocument->saveXML($this->keyInfo)));
         //=========================== PARA PODER CANONIZAR NOMINA ELECTRONICA Y NOMINA DE AJUSTE ====================================================\\
        $CopyOfdomDocumentReferenceKeyInfoC14N = $this->domDocumentReferenceKeyInfoC14N->saveXML();
        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else
            if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
                $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
                $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            }
        $value = str_replace($SearchNS, $ReplacementNS, $this->domDocumentReferenceKeyInfoC14N->saveXML());
        $this->domDocumentReferenceKeyInfoC14N->loadXML($value);

        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else
            if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
                $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
                $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            }
        $value = str_replace($SearchNS, $ReplacementNS, $this->domDocumentReferenceKeyInfoC14N->C14N());
        $this->domDocumentReferenceKeyInfoC14N->loadXML($CopyOfdomDocumentReferenceKeyInfoC14N);

        $this->DigestValueKeyInfo = base64_encode(hash($this->algorithm['hash'], $value, true));
        //=================================================================== FIN ==================================================================\\
        // $this->DigestValueKeyInfo = base64_encode(hash($this->algorithm['hash'], $this->domDocumentReferenceKeyInfoC14N->C14N(), true));

        $this->referenceKeyInfo = $this->domDocument->createElement('ds:Reference');
        $this->referenceKeyInfo->setAttribute('URI', "#{$this->KeyInfoID}");
        $this->signedInfo->appendChild($this->referenceKeyInfo);

        $this->digestMethodKeyInfo = $this->domDocument->createElement('ds:DigestMethod');
        $this->digestMethodKeyInfo->setAttribute('Algorithm', $this->algorithm['algorithm']);
        $this->referenceKeyInfo->appendChild($this->digestMethodKeyInfo);

        $this->digestValueKeyInfo = $this->domDocument->createElement('ds:DigestValue', $this->DigestValueKeyInfo);
        $this->referenceKeyInfo->appendChild($this->digestValueKeyInfo);

        $this->referenceSignedProperties = $this->domDocument->createElement('ds:Reference');
        $this->referenceSignedProperties->setAttribute('Type', self::SIGNED_PROPERTIES);
        $this->referenceSignedProperties->setAttribute('URI', "#{$this->SignedPropertiesID}");
        $this->signedInfo->appendChild($this->referenceSignedProperties);

        $this->digestMethodSignedProperties = $this->domDocument->createElement('ds:DigestMethod');
        $this->digestMethodSignedProperties->setAttribute('Algorithm', $this->algorithm['algorithm']);
        $this->referenceSignedProperties->appendChild($this->digestMethodSignedProperties);

        $this->domDocumentSignedPropertiesC14N = new DOMDocument($this->version, $this->encoding);
        $this->domDocumentSignedPropertiesC14N->loadXML(str_replace('<xades:SignedProperties ', "<xades:SignedProperties {$this->joinArray($this->ns)} ", $this->domDocument->saveXML($this->signedProperties)));

        // $this->DigestValueSignedProperties = base64_encode(hash($this->algorithm['hash'], $this->domDocumentSignedPropertiesC14N->C14N(), true));
        //=========================== PARA PODER CANONIZAR NOMINA ELECTRONICA Y NOMINA DE AJUSTE ====================================================\\
        $CopyOfdomDocumentSignedPropertiesC14N = $this->domDocumentSignedPropertiesC14N->saveXML();
        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
            $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
        }
        $value = str_replace($SearchNS, $ReplacementNS, $this->domDocumentSignedPropertiesC14N->saveXML());
        $this->domDocumentSignedPropertiesC14N->loadXML($value);

        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
            $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
        }
        $value = str_replace($SearchNS, $ReplacementNS, $this->domDocumentSignedPropertiesC14N->C14N());
        $this->domDocumentSignedPropertiesC14N->loadXML($CopyOfdomDocumentSignedPropertiesC14N);

        $this->DigestValueSignedProperties = base64_encode(hash($this->algorithm['hash'], $value, true));
        //=================================================================== FIN ==================================================================\\

        $this->digestValueSignedProperties = $this->domDocument->createElement('ds:DigestValue', $this->DigestValueSignedProperties);
        $this->referenceSignedProperties->appendChild($this->digestValueSignedProperties);

        // Signature set value
        $this->domDocumentSignatureValueC14N = new DOMDocument($this->version, $this->encoding);
        $this->domDocumentSignatureValueC14N->loadXML(str_replace('<ds:SignedInfo', "<ds:SignedInfo {$this->joinArray($this->ns)} ", $this->domDocument->saveXML($this->signedInfo)));

        // openssl_sign($this->domDocumentSignatureValueC14N->C14N(), $this->resultSignature, $this->certs['pkey'], $this->algorithm['sign']);
        //=========================== PARA PODER CANONIZAR NOMINA ELECTRONICA Y NOMINA DE AJUSTE ====================================================\\
        $CopyOfdomDocumentSignatureValueC14N = $this->domDocumentSignatureValueC14N->saveXML();
        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else
            if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
                $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
                $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            }
        $value = str_replace($SearchNS, $ReplacementNS, $this->domDocumentSignatureValueC14N->saveXML());
        $this->domDocumentSignatureValueC14N->loadXML($value);

        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else
            if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
                $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
                $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            }
        $value = str_replace($SearchNS, $ReplacementNS, $this->domDocumentSignatureValueC14N->C14N());
        $this->domDocumentSignatureValueC14N->loadXML($CopyOfdomDocumentSignatureValueC14N);

        openssl_sign($value, $this->resultSignature, $this->certs['pkey'], $this->algorithm['sign']);
        //=================================================================== FIN ==================================================================\\

        $this->signatureValue->nodeValue = base64_encode($this->resultSignature);
    }

    /**
     * Digest value XML.
     */
    private function digestValueXML()
    {
        $CopyOfdomDocument = $this->domDocument->saveXML();
        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else
            if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
                $SearchNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
                $ReplacementNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            }
        $value = str_replace($SearchNS,$ReplacementNS,$this->domDocument->saveXML());
        $this->domDocument->loadXML($value);

        if(strpos($this->xmlString, '</NominaIndividual>')){
            $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"';
            $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"';
        }
        else
            if(strpos($this->xmlString, '</NominaIndividualDeAjuste>')){
                $SearchNS = 'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
                $ReplacementNS = 'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"';
            }
        $value = str_replace($SearchNS,$ReplacementNS,$this->domDocument->C14N());
        $this->domDocument->loadXML($CopyOfdomDocument);

        $this->DigestValueXML = base64_encode(hash($this->algorithm['hash'], $value, true));
    }

    /**
     * Software security code.
     */
    private function softwareSecurityCode()
    {
        if (is_null($this->softwareID) || is_null($this->pin)) {
            return;
        }

        $number = $this->getTag('NumeroSecuenciaXML', 0)->getAttribute('Numero');
        $securityCode = hash('sha384', "{$this->softwareID}{$this->pin}{$number}");

        $this->getTag('ProveedorXML', 0)->setAttribute('SoftwareSC', $securityCode);
    }

    /**
     * Get CUNE.
     */
    public function getCUNE(): string
    {
        $informacionGeneralNode = $this->getTag('InformacionGeneral', 0);

        // CUNE
        $stringToHash = $this->getTag('NumeroSecuenciaXML', 0)->getAttribute('Numero')
            . $informacionGeneralNode->getAttribute('FechaGen')
            . $informacionGeneralNode->getAttribute('HoraGen')
            . ($this->getTag('DevengadosTotal', 0, false)->nodeValue ?? '0.00')
            . ($this->getTag('DeduccionesTotal', 0, false)->nodeValue ?? '0.00')
            . ($this->getTag('ComprobanteTotal', 0, false)->nodeValue ?? '0.00')
            . $this->getTag('Empleador', 0)->getAttribute('NIT')
            . ($this->getTag('Trabajador', 0, false)?->getAttribute('NumeroDocumento') ?? '0')
            . $informacionGeneralNode->getAttribute('TipoXML')
            . $this->pin
            . $informacionGeneralNode->getAttribute('Ambiente');

        return hash('sha384', $stringToHash);
    }

    /**
     * Set CUNE.
     */
    public function setCUNE()
    {
        $informacionGeneralNode = $this->getTag('InformacionGeneral', 0);

        $cuneValue = $this->getCUNE();
        $informacionGeneralNode->setAttribute('CUNE', $cuneValue);

        // QR URL
        $qr = ($informacionGeneralNode->getAttribute('Ambiente') == 2) ? "catalogo-vpfe-hab.dian.gov.co" : "catalogo-vpfe.dian.gov.co";
        $this->getTag('CodigoQR', 0)->nodeValue = "https://{$qr}/document/searchqr?documentkey={$cuneValue}";
    }

    /**
     * Get QR data.
     */
    public function getQRData(): string
    {
        $informacionGeneralNode = $this->getTag('InformacionGeneral', 0);
        $tipoNota = $this->getTag('TipoNota', 0, false);

        return "NumNIE: {$this->getTag('NumeroSecuenciaXML', 0)->getAttribute('Numero')}\n" .
            "FecNIE: {$informacionGeneralNode->getAttribute('FechaGen')}\n" .
            "HorNIE: {$informacionGeneralNode->getAttribute('HoraGen')}\n" .
            ($tipoNota ? "TipoNota: {$tipoNota->nodeValue}\n" : "") .
            "NitNIE: {$this->getTag('Empleador', 0)->getAttribute('NIT')}\n" .
            "DocEmp: " . ($this->getTag('Trabajador', 0, false)?->getAttribute('NumeroDocumento') ?? '0') . "\n" .
            "ValDev: " . ($this->getTag('DevengadosTotal', 0, false)->nodeValue ?? '0.00') . "\n" .
            "ValDed: " . ($this->getTag('DeduccionesTotal', 0, false)->nodeValue ?? '0.00') . "\n" .
            "ValTol: " . ($this->getTag('ComprobanteTotal', 0, false)->nodeValue ?? '0.00') . "\n" .
            "CUNE: {$informacionGeneralNode->getAttribute('CUNE')}\n" .
            $this->getTag('CodigoQR', 0)->nodeValue;
    }
}
