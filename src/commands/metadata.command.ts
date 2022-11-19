import { Command } from 'commander'
import { SpaceCaptionsDownloader } from '../modules/SpaceCaptionsDownloader'
import { SpaceCaptionsExtractor } from '../modules/SpaceCaptionsExtractor'
import { CommandUtil } from '../utils/CommandUtil'
import { randomUUID } from 'crypto'
import { configManager } from '../modules/ConfigManager'
import { TWITTER_AUTHORIZATION } from '../constants/twitter.constant'
import { TwitterApi } from '../apis/TwitterApi'
import { AudioSpace } from '../interfaces/Twitter.interface'
import { PeriscopeUtil } from '../utils/PeriscopeUtil'
import { PeriscopeApi } from '../apis/PeriscopeApi'
import { logger as baseLogger } from '../logger'

async function getHeaders() {
  const guestToken = await configManager.getGuestToken()
  const headers = {
    authorization: TWITTER_AUTHORIZATION,
    'x-guest-token': guestToken,
  }
  return headers
}
const command = new Command('metadata')
  .description('Grab metadata')

command
  .command('metadata <SPACE_ID>')
  .alias('m')
  .description('Grab Space Metadata')
  .action(async (spaceId, opts, cmd: Command) => {
    // let logger = baseLogger.child({ label: '[Metadata Extractor]' })
    // logger.info('Here')
    CommandUtil.detectDebugOption(cmd.parent.parent)
    let headers = await getHeaders()
    let response = await TwitterApi.getAudioSpaceById(spaceId, headers)
    const audioSpace = response?.data?.audioSpace as AudioSpace
    delete audioSpace.sharings
    const metadata = audioSpace?.metadata
    if (!metadata?.creator_results?.result?.rest_id) {
      delete metadata.creator_results
    }

    headers = await getHeaders()
    const liveStreamStatus = await TwitterApi.getLiveVideoStreamStatus(metadata.media_key, headers)
    const dynamicPlaylistUrl = liveStreamStatus.source.location
    const masterPlaylistUrl = `${PeriscopeUtil.getMasterPlaylistUrl(dynamicPlaylistUrl)}`
    const accessChatData = await PeriscopeApi.getAccessChat(liveStreamStatus.chatToken)
    response = {
      'master_playlist_url': masterPlaylistUrl,
      'access_chat_data' :accessChatData,
      'dynamic_playlist_url': dynamicPlaylistUrl,
      'meta': metadata,
      'livestream_status':liveStreamStatus,
    }
    console.log(JSON.stringify(response))
    // new SpaceCaptionsDownloader(spaceId, endpoint, token).download()
  })

command
  .command('extract <FILE> [STARTED_AT]')
  .alias('e')
  .description('Extract Space captions')
  .action((file, startedAt, opts, cmd: Command) => {
    CommandUtil.detectDebugOption(cmd.parent.parent)
    new SpaceCaptionsExtractor(file, null, startedAt).extract()
  })

export { command as metadataCommand }
