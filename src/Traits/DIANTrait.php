<?php

namespace Lopezsoft\UBL21dian\Traits;

use Exception;

/**
 * DIAN trait.
 */
trait DIANTrait
{
    /**
     * Version.
     *
     * @var string
     */
    public $version = '1.0';

    /**
     * Encoding.
     *
     * @var string
     */
    public $encoding = 'UTF-8';

    /**
     * Certs.
     *
     * @var array
     */
    protected $certs;

    /**
     * Attributes.
     *
     * @var array
     */
    protected $attributes;

    /**
     * Read certs.
     */
    protected function readCerts()
    {
        if (is_null($this->pathCertificate) || is_null($this->passwors)) {
            throw new Exception('Class '.get_class($this).': requires the certificate path and password.');
        }
        if (!openssl_pkcs12_read(file_get_contents($this->pathCertificate), $this->certs, $this->passwors)) {
            throw new Exception('Class '.get_class($this).': Failure signing data: '.openssl_error_string());
        }
    }

    /**
     * X509 export.
     */
    protected function x509Export()
    {
        if (!empty($this->certs)) {
            openssl_x509_export($this->certs['cert'], $stringCert);

            return str_replace([PHP_EOL, '-----BEGIN CERTIFICATE-----', '-----END CERTIFICATE-----'], '', $stringCert);
        }

        throw new Exception('Class '.get_class($this).': Error openssl x509 export.');
    }

    /**
     * Identifiers references.
     */
    protected function identifiersReferences()
    {
        foreach ($this->ids as $key => $value) {
            $this->$key = mb_strtoupper("{$value}-".sha1(uniqid()));
        }
    }

    /**
     * Remove child.
     *
     * @param string $tagName
     */
    protected function removeChild($tagName, $item = 0)
    {
        if (is_null($tag = $this->domDocument->documentElement->getElementsByTagName($tagName)->item($item))) {
            return;
        }

        $this->domDocument->documentElement->removeChild($tag);
    }

    /**
     * Get tag.
     */
    protected function getTag(string $tagName, int $item = 0, bool $validate = true): mixed
    {
        $tag = $this->domDocument->documentElement->getElementsByTagName($tagName);

        if (($validate) && (is_null($tag->item(0)))) {
            throw new Exception('Class ' . get_class($this) . ": The tag name {$tagName} does not exist.");
        }

        return $tag->item($item);
    }

    protected function ValueXML($stringXML, $xpath)
    {
        if(substr($xpath, 0, 1) != '/')
            return NULL;
        $search = substr($xpath, 1, strpos(substr($xpath, 1), '/'));
        $posinicio = strpos($stringXML, "<".$search);
        if($posinicio == 0)
            return false;
        $posinicio = strpos($stringXML, ">", $posinicio) + 1;
        $posCierre = strpos($stringXML, "</".$search.">", $posinicio);
        if($posCierre == 0)
            return true;
        $valorXML = substr($stringXML, $posinicio, $posCierre - $posinicio);
        if(strcmp(substr($xpath, strpos($xpath, $search) + strlen($search)), '/') != 0)
            return $this->ValueXML($valorXML, substr($xpath, strpos($xpath, $search) + strlen($search)));
        else
            return $valorXML;
    }

    /**
     * Get query.
     *
     * @param string $query
     * @param bool   $validate
     * @param int    $item
     *
     * @return mixed
     */
    protected function getQuery($query, $validate = true, $item = 0)
    {
        $tag = $this->domXPath->query($query);

        if (($validate) && (null == $tag->item(0))) {
            throw new Exception('Class '.get_class($this).": The query {$query} does not exist.");
        }
        if (is_null($item)) {
            return $tag;
        }

        return $tag->item($item);
    }

    /**
     * Join array.
     *
     * @param array  $array
     * @param bool   $formatNS
     * @param string $join
     *
     * @return string
     */
    protected function joinArray(array $array, $formatNS = true, $join = ' ')
    {
        return implode($join, array_map(function ($value, $key) use ($formatNS) {
            return ($formatNS) ? "{$key}=\"$value\"" : "{$key}=$value";
        }, $array, array_keys($array)));
    }

    /**
     * Set.
     *
     * @param any $name
     * @param any $value
     */
    public function __set($name, $value)
    {
        $this->attributes[$name] = $value;
    }

    /**
     * Get.
     *
     * @param any $name
     *
     * @return void
     */
    public function __get($name)
    {
        if (array_key_exists($name, $this->attributes)) {
            return $this->attributes[$name];
        }
        return;
    }
}
