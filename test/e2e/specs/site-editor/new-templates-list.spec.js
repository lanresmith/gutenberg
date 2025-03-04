/**
 * WordPress dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

test.describe( 'Templates', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.activateTheme( 'emptytheme' ),
			requestUtils.deleteAllTemplates( 'wp_template' ),
		] );
	} );
	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'twentytwentyone' );
	} );
	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllTemplates( 'wp_template' );
	} );
	test( 'Sorting', async ( { admin, page } ) => {
		await admin.visitSiteEditor( { path: '/wp_template/all' } );
		// Descending by title.
		await page
			.getByRole( 'button', { name: 'Template', exact: true } )
			.click();
		await page
			.getByRole( 'menuitemradio', {
				name: 'Sort descending',
			} )
			.click();
		const firstTitle = page
			.getByRole( 'region', {
				name: 'Template',
				includeHidden: true,
			} )
			.getByRole( 'link', { includeHidden: true } )
			.first();
		await expect( firstTitle ).toHaveText( 'Tag Archives' );
		// Ascending by title.
		await page
			.getByRole( 'menuitemradio', { name: 'Sort ascending' } )
			.click();
		await expect( firstTitle ).toHaveText( 'Category Archives' );
	} );
	test( 'Filtering', async ( { requestUtils, admin, page } ) => {
		await requestUtils.createTemplate( 'wp_template', {
			slug: 'date',
			title: 'Date Archives',
			content: 'hi',
		} );
		await admin.visitSiteEditor( { path: '/wp_template/all' } );
		// Global search.
		await page.getByRole( 'searchbox', { name: 'Search' } ).fill( 'tag' );
		const titles = page
			.getByRole( 'region', { name: 'Template' } )
			.getByRole( 'link', { includeHidden: true } );
		await expect( titles ).toHaveCount( 1 );
		await expect( titles.first() ).toHaveText( 'Tag Archives' );
		await page.getByRole( 'button', { name: 'Reset filters' } ).click();
		await expect( titles ).toHaveCount( 6 );

		// Filter by author.
		await page.getByRole( 'button', { name: 'Add filter' } ).click();
		await page.getByRole( 'menuitem', { name: 'Author' } ).click();
		await page.getByRole( 'option', { name: 'admin' } ).click();
		await page.keyboard.press( 'Escape' ); // close the menu.
		await expect( titles ).toHaveCount( 1 );
		await expect( titles.first() ).toHaveText( 'Date Archives' );

		// Filter by author and text.
		await page.getByRole( 'button', { name: 'Reset filters' } ).click();
		await page
			.getByRole( 'searchbox', { name: 'Search' } )
			.fill( 'archives' );
		await expect( titles ).toHaveCount( 3 );
		await page.getByRole( 'button', { name: 'Add filter' } ).click();
		await page.getByRole( 'menuitem', { name: 'Author' } ).click();
		await page.getByRole( 'option', { name: 'Emptytheme' } ).click();
		await page.keyboard.press( 'Escape' ); // close the menu.
		await expect( titles ).toHaveCount( 2 );
	} );
	test( 'Field visibility', async ( { admin, page } ) => {
		await admin.visitSiteEditor( { path: '/wp_template/all' } );
		await page.getByRole( 'button', { name: 'Description' } ).click();
		await page.getByRole( 'menuitem', { name: 'Hide' } ).click();
		await expect(
			page.getByRole( 'button', { name: 'Description' } )
		).toBeHidden();
	} );
} );
