<?php

namespace Lopezsoft\UBL21dian\Templates;

use Exception;
use Lopezsoft\UBL21dian\Client;
use Lopezsoft\UBL21dian\BinarySecurityToken\SOAP;

/**
 * Template.
 */
class Template extends SOAP
{
    /**
     * To.
     *
     * @var string
     */
    public $To = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl';
    public string $fileName = '';
    public string $contentFile = '';
    public string|null $testSetId = null;

    /**
     * Template.
     *
     * @var string
     */
    protected $template;

    /**
     * Sign.
     *
     * @return SOAP
     */
    public function sign($string = null): SOAP
    {
        $this->requiredProperties();

        return parent::sign($this->createTemplate());
    }

    /**
     * Sign to send.
     *
     * @return \Lopezsoft\UBL21dian\Client
     */
    public function signToSend(): Client
    {
        $this->requiredProperties();

        parent::sign($this->createTemplate());

        return new Client($this);
    }

    /**
     * Required properties.
     */
    private function requiredProperties()
    {
        if($this->requiredProperties){
            foreach ($this->requiredProperties as $requiredProperty) {
                if (is_null($this->$requiredProperty)) {
                    throw new Exception("The {$requiredProperty} property has to be defined");
                }
            }
        }
    }
}
