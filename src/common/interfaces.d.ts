export interface ISigner {
    sign(xml: string, certificateData: ICertificateData): Promise<string>;
}
export interface IHttpClient {
    post(data: any, headers: {
        [key: string]: string;
    }): Promise<any>;
}
export interface ITemplateParams {
    [key: string]: any;
}
export interface ISoapTemplate {
    getXml(params: ITemplateParams): string;
}
export interface IDianClientOptions {
    passwordPsswrd?: string;
    environment?: 1 | 2;
}
export interface ISendBillSyncParams extends ITemplateParams {
    fileName: string;
    contentFile: string;
}
export interface ISendBillAsyncParams extends ITemplateParams {
    fileName: string;
    contentFile: string;
}
export interface IGetNumberingRangeParams extends ITemplateParams {
    accountCode: string;
    accountCodeT: string;
    softwareCode: string;
}
export interface ISendEventParams extends ITemplateParams {
    contentFile: string;
}
export interface ISendTestSetAsyncParams extends ITemplateParams {
    fileName: string;
    contentFile: string;
    testSetId: string;
}
export interface IGetStatusZipParams extends ITemplateParams {
    trackId: string;
}
export interface ISendNominaSyncParams extends ITemplateParams {
    contentFile: string;
}
export interface ISendBillAttachmentAsyncParams extends ITemplateParams {
    fileName: string;
    contentFile: string;
}
export interface ICommandServices {
    soapClient: IHttpClient;
    soapSigner: ISigner;
    xmlSigner: ISigner;
    payrollSigner: ISigner;
    certificateData: any;
}
export interface ICommand<TParams, TResult> {
    execute(services: ICommandServices, params: TParams): Promise<TResult>;
}
export interface IGetStatusCommandParams {
    trackId: string;
}
export interface IGetXmlByDocumentKeyParams extends ITemplateParams {
    trackId: string;
}
export interface IGetXmlByDocumentKeyParams {
    trackId: string;
}
export interface IGetXmlByDocumentKeyParams {
    trackId: string;
}
export interface IGetReferenceNotesParams extends ITemplateParams {
    trackId: string;
}
export interface IGetAcquirerParams extends ITemplateParams {
    identificationType: string;
    identificationNumber: string;
}
export interface ISendBillSyncParams {
    fileName: string;
    unsignedUblXml: string;
}
export interface ISendBillAsyncParams {
    fileName: string;
    unsignedUblXml: string;
}
export interface ISendEventParams {
    unsignedEventXml: string;
}
export interface ISendNominaSyncParams {
    unsignedPayrollXml: string;
}
export interface ISendNominaSyncParams {
    unsignedPayrollXml: string;
}
export interface IGetStatusZipParams {
    trackId: string;
}
export interface ISendBillSyncTemplateParams extends ITemplateParams {
    fileName: string;
    contentFile: string;
}
export interface ISendBillAsyncTemplateParams extends ITemplateParams {
    fileName: string;
    contentFile: string;
}
export interface ISendEventTemplateParams extends ITemplateParams {
    contentFile: string;
}
export interface ISendNominaSyncTemplateParams extends ITemplateParams {
    contentFile: string;
}
export interface ICertificateData {
    privateKeyPem: string;
    publicKeyPem: string;
    x509CertificateBase64: string;
}
export interface IDianClientInitializeOptions {
    certificate: Buffer;
    passwordPsswrd: string;
}
