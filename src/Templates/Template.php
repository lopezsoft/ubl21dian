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

    /**
     * Template.
     *
     * @var string
     */
    protected $template;

    /**
     * Sign.
     *
     * @throws Exception
     */
    public function sign(string $string = null): \Lopezsoft\UBL21dian\Sign
    {
        $this->requiredProperties();

        return parent::sign($this->createTemplate());
    }

    /**
     * Sign to send.
     *
     * @return Client
     * @throws Exception
     */
    public function signToSend(): Client
    {
        $this->requiredProperties();

        parent::sign($this->createTemplate());

        return new Client($this);
    }

    /**
     * Required properties.
     * @throws Exception
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
