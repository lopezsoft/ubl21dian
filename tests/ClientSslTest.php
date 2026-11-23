<?php

namespace Lopezsoft\Tests;

use Lopezsoft\UBL21dian\Client;
use Lopezsoft\UBL21dian\Exceptions\SslCertificateException;
use Lopezsoft\UBL21dian\Templates\Template;
use ReflectionClass;

/**
 * CERT-02: verificación TLS activa por defecto en Client y opt-out explícito.
 * No usa red: se prueban la resolución de opciones cURL y la validación previa del CA bundle.
 */
class ClientSslTest extends TestCase
{
    /** @var array<string, string|false> */
    private array $originalEnv = [];

    protected function setUp(): void
    {
        parent::setUp();
        foreach ([Client::ENV_CA_BUNDLE, Client::ENV_SSL_VERIFY] as $name) {
            $this->originalEnv[$name] = getenv($name);
            putenv($name);
            unset($_ENV[$name], $_SERVER[$name]);
        }
        Client::configureSsl(null, null);
    }

    protected function tearDown(): void
    {
        foreach ($this->originalEnv as $name => $value) {
            $value === false ? putenv($name) : putenv("{$name}={$value}");
        }
        Client::configureSsl(null, null);
        parent::tearDown();
    }

    public function testVerificationIsEnabledByDefault(): void
    {
        $options = Client::resolveSslOptions();

        $this->assertTrue($options[CURLOPT_SSL_VERIFYPEER]);
        $this->assertSame(2, $options[CURLOPT_SSL_VERIFYHOST]);
        $this->assertArrayNotHasKey(CURLOPT_CAINFO, $options);
        $this->assertArrayNotHasKey(CURLOPT_CAPATH, $options);
    }

    public function testEnvironmentOptOutOnlyWithFalse(): void
    {
        putenv(Client::ENV_SSL_VERIFY.'=FALSE');
        $options = Client::resolveSslOptions();
        $this->assertFalse($options[CURLOPT_SSL_VERIFYPEER]);
        $this->assertSame(0, $options[CURLOPT_SSL_VERIFYHOST]);

        foreach (['0', 'no', 'off', '', 'true'] as $value) {
            putenv(Client::ENV_SSL_VERIFY.'='.$value);
            $this->assertTrue(
                Client::resolveSslOptions()[CURLOPT_SSL_VERIFYPEER],
                "El valor '{$value}' no debe desactivar la verificación"
            );
        }
    }

    public function testExplicitArgumentOverridesEnvironment(): void
    {
        putenv(Client::ENV_SSL_VERIFY.'=false');
        $this->assertTrue(Client::resolveSslOptions(true)[CURLOPT_SSL_VERIFYPEER]);

        putenv(Client::ENV_SSL_VERIFY);
        $this->assertFalse(Client::resolveSslOptions(false)[CURLOPT_SSL_VERIFYPEER]);
    }

    public function testCaBundleFromEnvironmentIsUsed(): void
    {
        $bundle = $this->createTempBundle();
        putenv(Client::ENV_CA_BUNDLE.'='.$bundle);

        $options = Client::resolveSslOptions();

        $this->assertSame($bundle, $options[CURLOPT_CAINFO]);
        $this->assertTrue($options[CURLOPT_SSL_VERIFYPEER]);
        @unlink($bundle);
    }

    public function testCaBundlePrecedence(): void
    {
        $envBundle = $this->createTempBundle();
        $globalBundle = $this->createTempBundle();
        $explicitBundle = $this->createTempBundle();
        putenv(Client::ENV_CA_BUNDLE.'='.$envBundle);

        Client::configureSsl(null, $globalBundle);
        $this->assertSame($globalBundle, Client::resolveSslOptions()[CURLOPT_CAINFO]);
        $this->assertSame($explicitBundle, Client::resolveSslOptions(null, $explicitBundle)[CURLOPT_CAINFO]);

        foreach ([$envBundle, $globalBundle, $explicitBundle] as $file) {
            @unlink($file);
        }
    }

    public function testCaDirectoryUsesCaPath(): void
    {
        $dir = sys_get_temp_dir();

        $options = Client::resolveSslOptions(null, $dir);

        $this->assertSame($dir, $options[CURLOPT_CAPATH]);
        $this->assertArrayNotHasKey(CURLOPT_CAINFO, $options);
    }

    public function testMissingCaBundleThrowsClearException(): void
    {
        $this->expectException(SslCertificateException::class);
        $this->expectExceptionMessage(Client::ENV_CA_BUNDLE);

        Client::resolveSslOptions(null, sys_get_temp_dir().'/ubl21dian-no-existe-'.uniqid().'.pem');
    }

    public function testMissingCaBundleIsIgnoredWhenVerificationIsDisabled(): void
    {
        $options = Client::resolveSslOptions(false, '/ruta/inexistente/cacert.pem');

        $this->assertFalse($options[CURLOPT_SSL_VERIFYPEER]);
        $this->assertArrayNotHasKey(CURLOPT_CAINFO, $options);
    }

    public function testConstructorValidatesTemplateCaBundleBeforeConnecting(): void
    {
        $template = (new ReflectionClass(Template::class))->newInstanceWithoutConstructor();
        $template->To = 'https://127.0.0.1:1/no-debe-conectar';
        $template->caBundle = sys_get_temp_dir().'/ubl21dian-no-existe-'.uniqid().'.pem';

        $this->expectException(SslCertificateException::class);

        new Client($template);
    }

    public function testCertificateErrorCodesAndMessage(): void
    {
        $this->assertTrue(Client::isCertificateError(60));
        $this->assertTrue(Client::isCertificateError(77));
        $this->assertFalse(Client::isCertificateError(7));
        $this->assertFalse(Client::isCertificateError(CURLE_OPERATION_TIMEDOUT));

        $message = Client::certificateErrorMessage(
            60,
            'SSL certificate problem: unable to get local issuer certificate',
            'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl'
        );

        $this->assertStringContainsString('cURL errno 60', $message);
        $this->assertStringContainsString(Client::ENV_CA_BUNDLE, $message);
        $this->assertStringContainsString('curl.cainfo', $message);
        $this->assertStringContainsString(Client::ENV_SSL_VERIFY.'=false', $message);
    }

    public function testSslExceptionKeepsBackwardCompatibleHierarchy(): void
    {
        $exception = new SslCertificateException('x', 77);

        $this->assertInstanceOf(\Exception::class, $exception);
        $this->assertSame(77, $exception->getCurlErrno());
    }

    private function createTempBundle(): string
    {
        $file = tempnam(sys_get_temp_dir(), 'ubl21dian-ca');
        file_put_contents($file, "-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----\n");

        return $file;
    }
}
