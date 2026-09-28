import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { API_URL, E2E_PASSWORD, uniqueEmail } from '../env';
import { apiAuthHeaders, apiLogin, deleteUser, getMe, listCvs } from '../utils/api';

test.describe('Guided onboarding', () => {
  test('sign-up lands on the onboarding @onboarding', async ({ page, request, registerPage }) => {
    const email = uniqueEmail('onboarding');
    await registerPage.goto();
    await registerPage.register({
      firstName: 'Awa',
      lastName: 'Koné',
      email,
      password: E2E_PASSWORD,
    });
    await page.waitForURL(/\/bienvenue/);
    await expect(page.getByTestId('onboarding-page')).toContainText('Bienvenue, Awa');

    const { accessToken } = await apiLogin(request, email, E2E_PASSWORD);
    await deleteUser(request, accessToken);
  });

  test('job, example and template create a pre-filled first CV @onboarding', async ({
    page,
    request,
    testUser,
  }) => {
    await loginAs(page, testUser);
    await expect(page.getByTestId('onboarding-banner')).toBeVisible();
    await page.getByTestId('onboarding-banner').getByRole('button', { name: 'Commencer' }).click();
    await page.waitForURL(/\/bienvenue/);

    // Step 1: target job and level.
    await page.locator('#targetRole').fill('Comptable');
    await page.getByRole('button', { name: 'Junior (moins de 3 ans)' }).click();
    await page.getByTestId('onboarding-next').click();

    // Step 2: the example matching the job is preselected.
    await expect(page.getByTestId('onboarding-example')).toHaveValue('comptable');
    await expect(page.getByTestId('onboarding-step-2')).toContainText(
      'Choisi d’après votre poste : Comptable'
    );
    await page.getByTestId('onboarding-next').click();

    // Step 3: default free template, then create.
    await page.getByTestId('onboarding-create').click();
    await page.waitForURL(/\/editor\/[0-9a-f-]{36}/);

    const cvs = await listCvs(request, testUser.accessToken);
    expect(cvs.items).toHaveLength(1);
    expect(cvs.items[0].title).toBe('CV — Comptable');

    const res = await request.get(`${API_URL}/cvs/${cvs.items[0].id}`, {
      headers: await apiAuthHeaders(testUser.accessToken),
    });
    const body = (await res.json()) as { data: { content: Record<string, unknown> } };
    const content = JSON.stringify(body.data.content);
    // The example's experience, with the user's own identity.
    expect(content).toContain('Groupe Industriel Teranga');
    expect(content).toContain(`${testUser.firstName} ${testUser.lastName}`);
    expect(content).toContain(testUser.email);

    const me = (await getMe(request, testUser.accessToken)) as Record<string, unknown>;
    expect(me.targetRole).toBe('Comptable');
    expect(me.careerLevel).toBe('junior');
    expect(me.onboardingCompletedAt).toBeTruthy();
  });

  test('skipping goes to the dashboard and hides the banner @onboarding', async ({
    page,
    request,
    testUser,
  }) => {
    await loginAs(page, testUser);
    await page.goto('/bienvenue');
    await page.getByTestId('onboarding-skip').click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByTestId('onboarding-banner')).toHaveCount(0);

    const me = (await getMe(request, testUser.accessToken)) as Record<string, unknown>;
    expect(me.onboardingCompletedAt).toBeTruthy();
    expect((await listCvs(request, testUser.accessToken)).items).toHaveLength(0);
  });

  test('a blank start creates an empty CV with the user identity @onboarding', async ({
    page,
    request,
    testUser,
  }) => {
    await loginAs(page, testUser);
    await page.goto('/bienvenue');
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-start-blank').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-create').click();
    await page.waitForURL(/\/editor\//);

    const [cv] = (await listCvs(request, testUser.accessToken)).items;
    const res = await request.get(`${API_URL}/cvs/${cv.id}`, {
      headers: await apiAuthHeaders(testUser.accessToken),
    });
    const { data } = (await res.json()) as {
      data: { content: { experiences: unknown[]; identity: { fullName: string } } };
    };
    expect(data.content.experiences).toHaveLength(0);
    expect(data.content.identity.fullName).toBe(`${testUser.firstName} ${testUser.lastName}`);
  });
});
