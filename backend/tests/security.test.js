import { assertPublicUrl, compileTemplate } from '../src/worker/executor.js';

describe('Workflow Engine Security Suite', () => {
  
  describe('SSRF Protection (assertPublicUrl)', () => {
    it('allows valid external URLs', async () => {
      await expect(assertPublicUrl('https://httpbin.org/post')).resolves.not.toThrow();
      await expect(assertPublicUrl('https://api.github.com/users')).resolves.not.toThrow();
    });

    it('blocks direct localhost and private IPs', async () => {
      await expect(assertPublicUrl('http://localhost:3001/api')).rejects.toThrow(/blocked/);
      await expect(assertPublicUrl('http://127.0.0.1/admin')).rejects.toThrow(/blocked/);
      await expect(assertPublicUrl('http://192.168.1.100')).rejects.toThrow(/blocked/);
    });

    it('blocks Cloud Metadata IPs', async () => {
      await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/blocked/);
    });

    it('blocks DNS rebinding / Magic DNS (nip.io)', async () => {
      await expect(assertPublicUrl('http://127.0.0.1.nip.io')).rejects.toThrow(/blocked internal IP/);
    });

    it('blocks unsupported protocols', async () => {
      await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow(/Unsupported protocol/);
    });
  });

  describe('SSTI Protection (compileTemplate)', () => {
    const context = {
      trigger: { name: 'Alice', role: 'admin' },
      http_response: { status: 200 }
    };

    it('compiles standard variables correctly', () => {
      const result = compileTemplate('Hello {{ trigger.name }}!', context);
      expect(result).toBe('Hello Alice!');
    });

    it('neutralizes Remote Code Execution (RCE) attempts', () => {
      const maliciousPayload = "{{ trigger.constructor.constructor('return process.env')() }}";
      const result = compileTemplate(maliciousPayload, context);
      expect(result).toBe('');
      expect(result).not.toContain('ENCRYPTION_KEY');
    });
  });
});